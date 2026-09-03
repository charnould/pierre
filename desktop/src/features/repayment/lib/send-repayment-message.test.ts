import { describe, expect, test } from 'bun:test'

import type { RcsContenu } from '../../../../../shared/rcs-message'
import {
  recordRepaymentEmail,
  repaymentFallbackDestinataire,
  sendRepaymentNote,
  sendRepaymentRcs
} from './send-repayment-message'

const rcs: RcsContenu = {
  body: 'Relance',
  sms_fallback: 'SMS Relance',
  choices: [{ type: 'reply', label: 'Je vous rappelle' }]
}

const tenant = {
  email_client: 'loc@exemple.fr',
  telephone_client: '+33600000000',
  adresse: '1 rue Test'
}

describe('repaymentFallbackDestinataire', () => {
  test('picks email, phone, or postal address by channel', () => {
    expect(repaymentFallbackDestinataire(tenant, 'email')).toBe('loc@exemple.fr')
    expect(repaymentFallbackDestinataire(tenant, 'rcs')).toBe('+33600000000')
    expect(repaymentFallbackDestinataire(tenant, 'courrier')).toBe('1 rue Test')
    expect(repaymentFallbackDestinataire({}, 'email')).toBe('')
  })
})

describe('sendRepaymentRcs', () => {
  test('sends the compose payload plus action, without a subject', async () => {
    let sent: unknown
    const previous = globalThis.window
    globalThis.window = {
      api: {
        sendCommunication: async (payload: unknown) => {
          sent = payload
          return { data: { id: 1 } }
        }
      }
    } as unknown as Window & typeof globalThis
    try {
      await expect(
        sendRepaymentRcs({
          url: 'https://pierre.test',
          tenantId: 'LOC-1',
          destinataire: '+33600000000',
          contenu: { ...rcs, action: 'relance' }
        })
      ).resolves.toEqual({ ok: true })
      expect(sent).toMatchObject({
        channel: 'rcs',
        contexte: 'repayment',
        ref: 'LOC-1',
        destinataire: '+33600000000',
        contenu: {
          action: 'relance',
          body: 'Relance',
          sms_fallback: 'SMS Relance',
          choices: [{ type: 'reply', label: 'Je vous rappelle' }]
        }
      })
      expect((sent as { contenu: Record<string, unknown> }).contenu).not.toHaveProperty('subject')
    } finally {
      globalThis.window = previous
    }
  })

  test('preserves a structured provider failure and its persisted activity', async () => {
    const previous = globalThis.window
    globalThis.window = {
      api: {
        sendCommunication: async () => ({
          error: { code: 'cm_rejected', message: 'Message rejeté par le prestataire' },
          data: { id: 7, type: 'communication.failed' }
        })
      }
    } as unknown as Window & typeof globalThis
    try {
      await expect(
        sendRepaymentRcs({
          url: 'https://pierre.test',
          tenantId: 'LOC-1',
          destinataire: '+33600000000',
          contenu: rcs
        })
      ).resolves.toMatchObject({
        ok: false,
        message: 'Message rejeté par le prestataire',
        activity: { id: 7, type: 'communication.failed' }
      })
    } finally {
      globalThis.window = previous
    }
  })

  test('keeps transport failures distinct from server errors', async () => {
    const previous = globalThis.window
    globalThis.window = {
      api: { sendCommunication: async () => null }
    } as unknown as Window & typeof globalThis
    try {
      await expect(
        sendRepaymentRcs({
          url: 'https://pierre.test',
          tenantId: 'LOC-1',
          destinataire: '+33600000000',
          contenu: rcs
        })
      ).resolves.toEqual({ ok: false })
    } finally {
      globalThis.window = previous
    }
  })

  test('refuses outbound send without destinataire', async () => {
    let calls = 0
    const previous = globalThis.window
    globalThis.window = {
      api: {
        sendCommunication: async () => {
          calls += 1
          return { data: { id: 1 } }
        }
      }
    } as unknown as Window & typeof globalThis
    try {
      await expect(
        sendRepaymentRcs({
          url: 'https://pierre.test',
          tenantId: 'LOC-1',
          destinataire: '',
          contenu: rcs
        })
      ).resolves.toEqual({ ok: false })
      expect(calls).toBe(0)
    } finally {
      globalThis.window = previous
    }
  })
})

describe('recordRepaymentEmail', () => {
  test('records an externally sent email without calling sendCommunication', async () => {
    let recorded: unknown
    const previous = globalThis.window
    globalThis.window = {
      api: {
        recordExternalCommunication: async (payload: unknown) => {
          recorded = payload
          return { data: { id: 1 } }
        },
        sendCommunication: async () => {
          throw new Error('must not send')
        }
      }
    } as unknown as Window & typeof globalThis
    try {
      await expect(
        recordRepaymentEmail({
          url: 'https://pierre.test',
          tenantId: 'LOC-1',
          destinataire: 'loc@exemple.fr',
          subject: 'Impayé',
          body: 'Relance',
          action: 'relance'
        })
      ).resolves.toEqual({ ok: true })
      expect(recorded).toMatchObject({
        channel: 'email',
        contexte: 'repayment',
        ref: 'LOC-1',
        destinataire: 'loc@exemple.fr',
        contenu: {
          action: 'relance',
          subject: 'Impayé',
          body: 'Relance'
        }
      })
    } finally {
      globalThis.window = previous
    }
  })

  test('refuses journal without destinataire', async () => {
    let calls = 0
    const previous = globalThis.window
    globalThis.window = {
      api: {
        recordExternalCommunication: async () => {
          calls += 1
          return { data: { id: 1 } }
        }
      }
    } as unknown as Window & typeof globalThis
    try {
      await expect(
        recordRepaymentEmail({
          url: 'https://pierre.test',
          tenantId: 'LOC-1',
          destinataire: '',
          body: 'Relance',
          action: 'relance'
        })
      ).resolves.toEqual({ ok: false })
      expect(calls).toBe(0)
    } finally {
      globalThis.window = previous
    }
  })
})

describe('sendRepaymentNote', () => {
  test('records a note via createActivity', async () => {
    let created: unknown
    await expect(
      sendRepaymentNote({
        tenantId: 'LOC-1',
        comment: 'Vu',
        createActivity: async (body) => {
          created = body
          return { data: { id: 2 } }
        }
      })
    ).resolves.toEqual({ ok: true })
    expect(created).toMatchObject({
      type: 'note.published',
      ref: 'LOC-1',
      contenu: JSON.stringify({ version: 2, text: 'Vu' })
    })
  })
})
