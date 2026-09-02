import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import type { ActivityStatus, CommunicationType } from '../../../../shared/activites'
import { get_activity } from '../../../utils/activities/rows'
import { create_activity, delete_activity, patch_activity } from '../../../utils/activities/write'
import {
  cm_webhook_authorized,
  communication_reference,
  find_recent_thread
} from '../../../utils/communications/parsing'
import { update_status } from '../../../utils/communications/status'
import {
  claim_outbound_dispatch,
  CommunicationsError,
  create_inbound,
  create_outbound,
  create_unmatched_inbound
} from '../../../utils/communications/storage'
import { datastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const SERVICE = '_test_communications'
const ROOT = datastorePaths(SERVICE).root
const originalService = Bun.env['SERVICE']

beforeAll(async () => {
  Bun.env['SERVICE'] = SERVICE
  await rm(ROOT, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  await rm(ROOT, { recursive: true, force: true })
  if (originalService === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = originalService
})

describe('communications', () => {
  it('réutilise un thread par dossier et sépare les mediums', () => {
    const first = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'A-1',
      type: 'email',
      destinataire: 'tenant@example.org',
      contenu: JSON.stringify({ version: 1, corps: 'Premier' }),
      idempotency_key: crypto.randomUUID()
    })
    const second = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'A-1',
      type: 'email',
      destinataire: 'tenant@example.org',
      contenu: JSON.stringify({ version: 1, corps: 'Second' }),
      idempotency_key: crypto.randomUUID()
    })
    const rcs = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'A-1',
      type: 'rcs',
      destinataire: '06 12 34 56 78',
      contenu: JSON.stringify({ version: 1, corps: 'RCS' }),
      idempotency_key: crypto.randomUUID()
    })

    expect(first.thread_id).toBe(second.thread_id)
    expect(rcs.thread_id).not.toBe(first.thread_id)
    expect(rcs.destinataire).toBe('+33612345678')
    expect(communication_reference(first.id)).toBe(`p${first.id}`)
  })

  it('rend un retry identique sans doublon et refuse un conflit', () => {
    const key = crypto.randomUUID()
    const base = {
      actor: 'alice@example.org',
      contexte: 'automations' as const,
      ref: 'A-2',
      type: 'email' as const,
      destinataire: 'tenant@example.org',
      contenu: JSON.stringify({ version: 1, corps: 'Identique' }),
      idempotency_key: key
    }
    const first = create_outbound(base)
    expect(create_outbound(base).id).toBe(first.id)
    expect(() => create_outbound({ ...base, contenu: '{"version":1,"corps":"Autre"}' })).toThrow(
      CommunicationsError
    )

    const db = new Database(`${ROOT}/datastore.sqlite`, { readonly: true })
    const count = db
      .query<{ count: number }, [string]>(
        'SELECT COUNT(*) AS count FROM activites WHERE idempotency_key = ?'
      )
      .get(key)?.count
    db.close()
    expect(count).toBe(1)
  })

  it('ne rejoue pas un dispatch et clôt un claim abandonné', () => {
    const activity = create_outbound({
      actor: 'alice@example.org',
      contexte: 'tickets',
      ref: 'DISPATCH-1',
      type: 'rcs',
      destinataire: '+33612345678',
      contenu: JSON.stringify({ version: 1, corps: 'Bonjour' }),
      idempotency_key: crypto.randomUUID()
    })
    expect(claim_outbound_dispatch(activity.id)).toBe('claimed')
    expect(claim_outbound_dispatch(activity.id)).toBe('pending')

    const db = new Database(datastorePaths(SERVICE).database)
    const content = JSON.parse(activity.contenu)
    content.delivery.dispatch_started_at = '2000-01-01T00:00:00Z'
    db.run('UPDATE activites SET contenu = ? WHERE id = ?', [JSON.stringify(content), activity.id])
    db.close()

    expect(claim_outbound_dispatch(activity.id)).toBe('abandoned')
    expect(get_activity(activity.id)?.statut).toBe('failed')
  })

  it('ignore un statut retardé et bloque les écritures génériques', () => {
    const activity = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'A-3',
      type: 'email',
      destinataire: 'tenant@example.org',
      contenu: JSON.stringify({ version: 1, corps: 'Statut' }),
      idempotency_key: crypto.randomUUID()
    })
    const delivered = update_status({
      activity_id: activity.id,
      type: 'email',
      statut: 'delivered',
      occurred_at: '2030-08-26T20:00:00Z'
    })
    const delayed = update_status({
      activity_id: activity.id,
      type: 'email',
      statut: 'sent',
      occurred_at: '2029-08-26T19:59:59Z'
    })
    expect(delivered.statut).toBe('delivered')
    expect(delayed.statut).toBe('delivered')
    const history = JSON.parse(delayed.contenu).delivery.history as unknown[]
    expect(history).toHaveLength(3)
    const laterFailure = update_status({
      activity_id: activity.id,
      type: 'email',
      statut: 'failed',
      occurred_at: '2031-08-26T20:00:00Z'
    })
    expect(laterFailure.statut).toBe('failed')
    const duplicate = update_status({
      activity_id: activity.id,
      type: 'email',
      statut: 'sent',
      occurred_at: '2029-08-26T19:59:59Z'
    })
    expect(duplicate.statut).toBe('failed')
    expect(JSON.parse(duplicate.contenu).delivery.history).toHaveLength(4)
    expect(() =>
      patch_activity('alice@example.org', activity.id, {
        operation: 'set_status',
        statut: 'read'
      })
    ).toThrow()
    expect(() => delete_activity('alice@example.org', activity.id)).toThrow()
    expect(() =>
      create_activity('alice@example.org', {
        contexte: 'automations',
        ref: 'A-3',
        type: 'email',
        destinataire: 'tenant@example.org',
        contenu: 'Contournement'
      })
    ).toThrow()
  })

  it('accepte la matrice terminale de tous les canaux et ordonne delivery.history', () => {
    const failures: Record<Exclude<CommunicationType, 'signature'>, ActivityStatus[]> = {
      rcs: ['failed'],
      sms: ['failed'],
      email: ['failed'],
      courrier: ['returned', 'failed'],
      lrar: ['refused', 'returned', 'failed'],
      lre: ['refused', 'expired', 'failed']
    }
    for (const [type, statuses] of Object.entries(failures) as Array<
      [Exclude<CommunicationType, 'signature'>, ActivityStatus[]]
    >) {
      for (const status of statuses) {
        const activity = create_outbound({
          actor: 'alice@example.org',
          contexte: 'automations',
          ref: `${type}-${status}`,
          type,
          destinataire:
            type === 'rcs' || type === 'sms'
              ? '+33612345678'
              : type === 'email' || type === 'lre'
                ? 'tenant@example.org'
                : '1 rue de la Paix',
          contenu: JSON.stringify({ version: 1, corps: 'Test' }),
          idempotency_key: crypto.randomUUID()
        })
        const failed = update_status({
          activity_id: activity.id,
          type,
          statut: status,
          occurred_at: '2031-01-01T00:00:00Z'
        })
        expect(failed.statut).toBe(status)
        expect(
          (JSON.parse(failed.contenu).delivery.history as Array<{ status: string }>).map(
            (item) => item.status
          )
        ).toEqual(['queued', status])
      }
    }
  })

  it('crée les entrants dans le thread et conserve les messages non qualifiés', () => {
    const outbound = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'A-4',
      type: 'email',
      destinataire: 'tenant@example.org',
      contenu: JSON.stringify({ version: 1, corps: 'Question' }),
      idempotency_key: crypto.randomUUID()
    })
    const inbound = create_inbound({
      contexte: 'automations',
      ref: 'A-4',
      type: 'email',
      auteur: 'external:tenant@example.org',
      contenu: JSON.stringify({ version: 1, corps: 'Réponse' }),
      occurred_at: '2026-08-26T20:00:00Z'
    })
    const unmatched = create_unmatched_inbound({
      type: 'email',
      auteur: 'external:unknown@example.org',
      contenu: JSON.stringify({ version: 1, corps: 'Inconnu' }),
      occurred_at: '2026-08-26T20:01:00Z'
    })

    expect(inbound.thread_id).toBe(outbound.thread_id)
    expect(inbound.statut).toBe('received')
    expect(unmatched.rattachement.startsWith('a_qualifier:')).toBe(true)
    expect(unmatched.id_client).toBeNull()
    expect(unmatched.id_locataire).toBeNull()
    expect(unmatched.id_lot).toBeNull()
  })

  it('ne rattache implicitement que le dossier récent et non ambigu', () => {
    create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'HEURISTIC-1',
      type: 'email',
      destinataire: 'unique@example.org',
      contenu: JSON.stringify({ version: 1, corps: 'Unique' }),
      idempotency_key: crypto.randomUUID()
    })
    expect(find_recent_thread('email', 'unique@example.org')?.ref).toBe('HEURISTIC-1')

    for (const ref of ['AMBIGUOUS-1', 'AMBIGUOUS-2']) {
      create_outbound({
        actor: 'alice@example.org',
        contexte: 'automations',
        ref,
        type: 'email',
        destinataire: 'shared@example.org',
        contenu: JSON.stringify({ version: 1, corps: ref }),
        idempotency_key: crypto.randomUUID()
      })
    }
    expect(find_recent_thread('email', 'shared@example.org')).toBeNull()
  })

  it('expose une ligne autosuffisante et sans payload prestataire pour le LLM', () => {
    const activity = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'LLM-1',
      type: 'rcs',
      destinataire: '+33612345678',
      contenu: JSON.stringify({
        version: 1,
        corps: 'Souhaitez-vous être rappelé ?',
        choix: [{ id: 'rappeler', label: 'Être rappelé' }]
      }),
      idempotency_key: crypto.randomUUID()
    })
    expect(activity).toMatchObject({
      auteur: 'user:alice@example.org',
      destinataire: '+33612345678',
      type: 'rcs',
      statut: 'queued'
    })
    expect(activity.date_creation).toBeTruthy()
    expect(activity.date_statut).toBeTruthy()
    expect(activity.contenu).toContain('Être rappelé')
    expect(activity.contenu).not.toContain('richContent')
    expect(activity.contenu).not.toContain('messages')
  })
})

describe('cm_webhook_authorized', () => {
  const original = Bun.env['CM_WEBHOOK_SECRET']

  afterAll(() => {
    if (original === undefined) delete Bun.env['CM_WEBHOOK_SECRET']
    else Bun.env['CM_WEBHOOK_SECRET'] = original
  })

  it('exige un secret non vide et identique au header', () => {
    delete Bun.env['CM_WEBHOOK_SECRET']
    expect(cm_webhook_authorized('anything')).toBe(false)
    Bun.env['CM_WEBHOOK_SECRET'] = '  '
    expect(cm_webhook_authorized('  ')).toBe(false)
    Bun.env['CM_WEBHOOK_SECRET'] = 'secret'
    expect(cm_webhook_authorized(undefined)).toBe(false)
    expect(cm_webhook_authorized('wrong')).toBe(false)
    expect(cm_webhook_authorized('secret')).toBe(true)
  })
})
