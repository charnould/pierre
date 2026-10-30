import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { migrate_datastore } from '../../../utils/datastore-migrations'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { automationsReady, SetupError, ticketsReady, writeSetup } from '../../../utils/setup-store'
import { repaymentSchedule } from '../../seed-setup'

const paths = testDatastorePaths('setup_store')

function repaymentBody(schedule?: typeof repaymentSchedule): string {
  return JSON.stringify({
    buckets: [
      { id: 'non_traites', label: 'Non traités' },
      { id: 'clients_partis', label: 'Partis' }
    ],
    actions: { dossier: ['Analyser'], bulk_operations: ['Relancer'] },
    tags: ['décès'],
    template_groups: ['RCS'],
    templates: ['note.md'],
    ...(schedule ? { create_plan: { schedule } } : {})
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
    ).rejects.toThrow('create_plan.schedule requis.')
  })

  it('rejects a repayment threshold that cannot be confirmed', async () => {
    const schedule = {
      ...repaymentSchedule,
      thresholds: [{ months: 36, message: 'Trop tard.' }]
    }
    await expect(
      writeSetup('repayment', new TextEncoder().encode(repaymentBody(schedule)))
    ).rejects.toThrow('schedule.thresholds[0].months')
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
