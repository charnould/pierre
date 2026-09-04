import { describe, expect, test } from 'bun:test'

import { repaymentFallbackDestinataire, sendRepaymentMessage } from './send-repayment-message'

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

describe('sendRepaymentMessage', () => {
  test('sends outbound email via sendCommunication', async () => {
    const sendCommunication = async () => ({ data: { id: 1 } })
    const createActivity = async () => {
      throw new Error('note path')
    }
    const previous = globalThis.window
    globalThis.window = {
      api: { sendCommunication }
    } as unknown as Window & typeof globalThis
    try {
      await expect(
        sendRepaymentMessage({
          url: 'https://pierre.test',
          tenantId: 'LOC-1',
          comment: 'Relance',
          channel: 'email',
          destinataire: 'loc@exemple.fr',
          options: { action: 'relance', objet: 'Impayé' },
          createActivity
        })
      ).resolves.toBe(true)
    } finally {
      globalThis.window = previous
    }
  })

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
        sendRepaymentMessage({
          url: 'https://pierre.test',
          tenantId: 'LOC-1',
          comment: 'Relance',
          channel: 'email',
          destinataire: 'loc@exemple.fr',
          options: { action: 'relance', objet: 'Impayé', delivery: 'external' },
          createActivity: async () => null
        })
      ).resolves.toBe(true)
      expect(recorded).toMatchObject({
        canal: 'email',
        contexte: 'repayment',
        ref: 'LOC-1',
        destinataire: 'loc@exemple.fr'
      })
    } finally {
      globalThis.window = previous
    }
  })

  test('records a note via createActivity', async () => {
    let created: unknown
    const previous = globalThis.window
    globalThis.window = { api: {} } as unknown as Window & typeof globalThis
    try {
      await expect(
        sendRepaymentMessage({
          url: 'https://pierre.test',
          tenantId: 'LOC-1',
          comment: 'Vu',
          channel: 'note',
          destinataire: '',
          createActivity: async (body) => {
            created = body
            return { data: { id: 2 } }
          }
        })
      ).resolves.toBe(true)
      expect(created).toMatchObject({ type: 'note', ref: 'LOC-1' })
    } finally {
      globalThis.window = previous
    }
  })

  test('refuses outbound send without destinataire', async () => {
    const previous = globalThis.window
    globalThis.window = {
      api: { sendCommunication: async () => ({ data: { id: 1 } }) }
    } as unknown as Window & typeof globalThis
    try {
      await expect(
        sendRepaymentMessage({
          url: 'https://pierre.test',
          tenantId: 'LOC-1',
          comment: 'Relance',
          channel: 'email',
          destinataire: '',
          options: { action: 'relance' },
          createActivity: async () => ({ data: { id: 1 } })
        })
      ).resolves.toBe(false)
    } finally {
      globalThis.window = previous
    }
  })
})
