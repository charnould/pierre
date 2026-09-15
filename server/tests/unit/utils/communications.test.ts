import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import type { CommunicationChannel } from '../../../../shared/activites'
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
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('communications')

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  await rm(paths.root, { recursive: true, force: true })
  setDatastoreRoot(null)
})

describe('communications', () => {
  it('crée un thread distinct pour chaque communication', () => {
    const first = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'A-1',
      type: 'email',
      destinataire: 'tenant@example.org',
      contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Premier' }),
      idempotency_key: Bun.randomUUIDv7()
    })
    const second = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'A-1',
      type: 'email',
      destinataire: 'tenant@example.org',
      contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Second' }),
      idempotency_key: Bun.randomUUIDv7()
    })
    const rcs = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'A-1',
      type: 'rcs',
      destinataire: '06 12 34 56 78',
      contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'RCS' }),
      idempotency_key: Bun.randomUUIDv7()
    })

    expect(first.thread_id).not.toBe(second.thread_id)
    expect(rcs.thread_id).not.toBe(first.thread_id)
    expect(rcs.destinataire).toBe('+33612345678')
    expect(communication_reference(first.id)).toBe(`p${first.id}`)
  })

  it('rend un retry identique sans doublon et refuse un conflit', () => {
    const key = Bun.randomUUIDv7()
    const base = {
      actor: 'alice@example.org',
      contexte: 'automations' as const,
      ref: 'A-2',
      type: 'email' as const,
      destinataire: 'tenant@example.org',
      contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Identique' }),
      idempotency_key: key
    }
    const first = create_outbound(base)
    expect(create_outbound(base).id).toBe(first.id)
    expect(() =>
      create_outbound({
        ...base,
        contenu: JSON.stringify({
          version: 2,
          sender: 'user:alice@example.org',
          body: 'Autre'
        })
      })
    ).toThrow(CommunicationsError)

    const db = new Database(`${paths.root}/datastore.sqlite`, { readonly: true })
    const count = db
      .query<{ count: number }, [string]>(
        'SELECT COUNT(*) AS count FROM activites WHERE idempotency_key = ?'
      )
      .get(key)?.count
    db.close()
    expect(count).toBe(1)
  })

  it('laisse le dispatch réclamable jusqu’à un événement terminal', () => {
    const activity = create_outbound({
      actor: 'alice@example.org',
      contexte: 'tickets',
      ref: 'DISPATCH-1',
      type: 'rcs',
      destinataire: '+33612345678',
      contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Bonjour' }),
      idempotency_key: Bun.randomUUIDv7()
    })
    expect(claim_outbound_dispatch(activity.id)).toBe('claimed')
    expect(claim_outbound_dispatch(activity.id)).toBe('claimed')
    update_status({
      activity_id: activity.id,
      type: 'rcs',
      statut: 'delivered',
      occurred_at: '2030-08-26T20:00:00Z'
    })
    expect(claim_outbound_dispatch(activity.id)).toBe('not_queued')
  })

  it('ignore un statut retardé et bloque les écritures génériques', () => {
    const activity = create_outbound({
      actor: 'alice@example.org',
      contexte: 'automations',
      ref: 'A-3',
      type: 'email',
      destinataire: 'tenant@example.org',
      contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Statut' }),
      idempotency_key: Bun.randomUUIDv7()
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
    expect(delivered.type).toBe('communication.ok')
    expect(JSON.parse(delivered.contenu)).toMatchObject({ version: 2, result: 'delivered' })
    expect(delayed.id).toBe(activity.id)
    const laterFailure = update_status({
      activity_id: activity.id,
      type: 'email',
      statut: 'failed',
      occurred_at: '2031-08-26T20:00:00Z'
    })
    expect(laterFailure.id).toBe(activity.id)
    const duplicate = update_status({
      activity_id: activity.id,
      type: 'email',
      statut: 'sent',
      occurred_at: '2029-08-26T19:59:59Z'
    })
    expect(duplicate.id).toBe(activity.id)
    expect(() =>
      patch_activity('alice@example.org', activity.id, {
        operation: 'edit_content',
        contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'x' })
      })
    ).toThrow()
    expect(() => delete_activity('alice@example.org', activity.id)).toThrow()
    expect(() =>
      create_activity('alice@example.org', {
        contexte: 'automations',
        ref: 'A-3',
        type: 'communication.sent',
        channel: 'email',
        destinataire: 'tenant@example.org',
        contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'x' })
      })
    ).toThrow()
  })

  it('accepte les événements d’échec terminaux de tous les canaux', () => {
    const failures: Record<CommunicationChannel, string[]> = {
      rcs: ['failed'],
      sms: ['failed'],
      email: ['failed'],
      postal_letter: ['returned', 'failed'],
      postal_registered_letter_with_acknowledgement: ['refused', 'returned', 'failed'],
      electronic_registered_delivery: ['refused', 'expired', 'failed'],
      electronic_registered_letter: ['refused', 'expired', 'failed']
    }
    for (const [type, statuses] of Object.entries(failures) as Array<
      [CommunicationChannel, string[]]
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
              : type === 'email' ||
                  type === 'electronic_registered_delivery' ||
                  type === 'electronic_registered_letter'
                ? 'tenant@example.org'
                : '1 rue de la Paix',
          contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Test' }),
          idempotency_key: Bun.randomUUIDv7()
        })
        const failed = update_status({
          activity_id: activity.id,
          type,
          statut: status,
          occurred_at: '2031-01-01T00:00:00Z'
        })
        expect(failed.type).toBe('communication.failed')
        expect(JSON.parse(failed.contenu)).toEqual({ version: 2, reason: status })
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
      contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Question' }),
      idempotency_key: Bun.randomUUIDv7()
    })
    const inbound = create_inbound({
      contexte: 'automations',
      ref: 'A-4',
      type: 'email',
      auteur: 'external:tenant@example.org',
      contenu: JSON.stringify({
        version: 2,
        sender: 'external:tenant@example.org',
        body: 'Réponse'
      }),
      occurred_at: '2026-08-26T20:00:00Z',
      thread_id: outbound.thread_id!
    })
    const unmatched = create_unmatched_inbound({
      type: 'email',
      auteur: 'external:unknown@example.org',
      contenu: JSON.stringify({
        version: 2,
        sender: 'external:unknown@example.org',
        body: 'Inconnu'
      }),
      occurred_at: '2026-08-26T20:01:00Z'
    })

    expect(inbound.thread_id).toBe(outbound.thread_id)
    expect(inbound.type).toBe('communication.received')
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
      contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: 'Unique' }),
      idempotency_key: Bun.randomUUIDv7()
    })
    expect(find_recent_thread('email', 'unique@example.org')?.ref).toBe('HEURISTIC-1')

    for (const ref of ['AMBIGUOUS-1', 'AMBIGUOUS-2']) {
      create_outbound({
        actor: 'alice@example.org',
        contexte: 'automations',
        ref,
        type: 'email',
        destinataire: 'shared@example.org',
        contenu: JSON.stringify({ version: 2, sender: 'user:alice@example.org', body: ref }),
        idempotency_key: Bun.randomUUIDv7()
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
        version: 2,
        sender: 'user:alice@example.org',
        body: 'Souhaitez-vous être rappelé ?',
        choices: ['Être rappelé']
      }),
      idempotency_key: Bun.randomUUIDv7()
    })
    expect(activity).toMatchObject({
      auteur: 'user:alice@example.org',
      destinataire: '+33612345678',
      type: 'communication.sent',
      channel: 'rcs'
    })
    expect(activity.date_creation).toBeTruthy()
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
