import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { migrate_datastore } from '../../../utils/datastore-migrations'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import {
  automationsReady,
  REPAYMENT_DOCUMENT_IDS,
  repaymentReady,
  SetupError,
  ticketsReady,
  writeSetup
} from '../../../utils/setup-store'
import { repaymentSchedule } from '../../seed-setup'

const paths = testDatastorePaths('setup_store')

function repaymentBody(schedule?: object): string {
  return JSON.stringify({
    phases: ['Non traités', 'Partis'],
    caseActions: ['Analyser'],
    batchActions: ['Relancer'],
    tags: ['décès'],
    ...(schedule ? { schedule } : {})
  })
}

beforeEach(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  await mkdir(paths.root, { recursive: true })
  await migrate_datastore(paths.database)
})

afterEach(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('setup store', () => {
  it('stores a valid tickets document before the docx, without marking the entry ready', async () => {
    const body = JSON.stringify({
      buckets: [{ id: 'non_traitees', label: 'Réclamations' }],
      actions: { dossier: ['Analyser le dossier'] },
      tags: ['Urgent']
    })
    await writeSetup('tickets', new TextEncoder().encode(body))
    expect(ticketsReady()).toBeNull()
  })

  it('opens automations when the report prompt is set', async () => {
    expect(automationsReady()).toBeNull()
    await writeSetup('automations/AGENTS.md', new TextEncoder().encode('Rapport.'))
    expect(automationsReady()?.prompt).toContain('Rapport')
  })

  it('rejects an empty tickets document as invalid JSON', async () => {
    await expect(writeSetup('tickets', new TextEncoder().encode(''))).rejects.toThrow(
      'JSON invalide.'
    )
  })

  it('rejects a repayment document without a schedule', async () => {
    await expect(
      writeSetup('repayment', new TextEncoder().encode(repaymentBody()))
    ).rejects.toThrow('repayment.schedule requis.')
  })

  it('rejects a repayment threshold that cannot be confirmed', async () => {
    const schedule = {
      ...repaymentSchedule,
      confirmAfterInstallments: { '36': 'Trop tard.' }
    }
    await expect(
      writeSetup('repayment', new TextEncoder().encode(repaymentBody(schedule)))
    ).rejects.toThrow('schedule.confirmAfterInstallments.36')
  })

  it('rejects an unknown repayment key and the reserved phase', async () => {
    const body = JSON.parse(repaymentBody(repaymentSchedule)) as Record<string, unknown>
    await expect(
      writeSetup('repayment', new TextEncoder().encode(JSON.stringify({ ...body, buckets: [] })))
    ).rejects.toThrow('clé inconnue')
    await expect(
      writeSetup(
        'repayment',
        new TextEncoder().encode(
          JSON.stringify({ ...body, phases: ['Non traités', 'À reclasser'] })
        )
      )
    ).rejects.toThrow('réservé')
  })

  it('keeps repayment closed until the four word documents are stored', async () => {
    const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    await writeSetup('repayment', new TextEncoder().encode(repaymentBody(repaymentSchedule)))
    await writeSetup('repayment/AGENTS.md', new TextEncoder().encode('Impayés.'))
    await writeSetup(
      'repayment/messages',
      new TextEncoder().encode(
        JSON.stringify([
          JSON.stringify({
            group: 'RCS',
            action: 'Relancer',
            label: 'Relance',
            body: 'Bonjour.',
            choices: []
          })
        ])
      )
    )
    expect(repaymentReady()).toBeNull()
    for (const id of REPAYMENT_DOCUMENT_IDS.slice(0, 3)) await writeSetup(id, docx)
    expect(repaymentReady()).toBeNull()
    await writeSetup(REPAYMENT_DOCUMENT_IDS[3], docx)
    expect(repaymentReady()?.phases).toEqual(['Non traités', 'Partis'])
  })

  it('rejects the retired repayment template id', async () => {
    await expect(
      writeSetup('repayment/template.docx', new Uint8Array([0x50, 0x4b, 0x03, 0x04]))
    ).rejects.toThrow('pièce inconnue.')
  })

  it('rejects a tickets document without the system bucket', async () => {
    const body = JSON.stringify({
      buckets: [{ id: 'autre', label: 'Autre' }],
      actions: { dossier: ['Analyser le dossier'] },
      tags: ['Urgent']
    })
    await expect(writeSetup('tickets', new TextEncoder().encode(body))).rejects.toBeInstanceOf(
      SetupError
    )
  })
})
