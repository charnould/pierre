import { describe, expect, it } from 'bun:test'

import {
  deliveryAction,
  emptyBulkOperationDefinition,
  type BulkOperationDefinition
} from '../../../../../shared/bulk-operations'
import { BulkOperationDefinitionSchema } from '../../../../utils/bulk/query'

describe('BulkOperationDefinitionSchema', () => {
  it('accepts inline fallback content', () => {
    const definition = emptyBulkOperationDefinition()
    definition.delivery = {
      kind: 'fallback',
      steps: [
        {
          medium: 'email',
          action: 'Relancer',
          subject: 'Dette {{solde}}',
          body: 'Bonjour',
          placeholderBindings: { solde: 'solde_locataire' }
        }
      ]
    }
    expect(BulkOperationDefinitionSchema.parse(definition)).toEqual(definition)
    expect(definition).not.toHaveProperty('applyWithoutSendAction')
    expect(deliveryAction(definition.delivery)).toBe('Relancer')
    expect(
      deliveryAction({
        kind: 'rich_rcs',
        action: 'Parcours',
        replyTimeoutHours: 72,
        placeholderBindings: {},
        nodes: [{ id: 'message_1', body: 'Bonjour', richContent: {}, transitions: {} }]
      })
    ).toBe('Parcours')
  })

  it('requires one to six unique fallback media', () => {
    const definition = emptyBulkOperationDefinition()
    expect(() =>
      BulkOperationDefinitionSchema.parse({
        ...definition,
        delivery: { kind: 'fallback', steps: [] }
      })
    ).toThrow()
    expect(() =>
      BulkOperationDefinitionSchema.parse({
        ...definition,
        delivery: {
          kind: 'fallback',
          steps: [
            {
              medium: 'rcs',
              action: 'RCS',
              body: 'Bonjour',
              placeholderBindings: {}
            },
            {
              medium: 'rcs',
              action: 'RCS bis',
              body: 'Bonjour',
              placeholderBindings: {}
            }
          ]
        }
      })
    ).toThrow()
  })

  it('validates rich RCS transitions and stable postbacks', () => {
    const definition = {
      ...emptyBulkOperationDefinition(),
      delivery: {
        kind: 'rich_rcs' as const,
        action: 'Relancer',
        replyTimeoutHours: 72,
        placeholderBindings: { nom: 'nom_locataire' },
        nodes: [
          {
            id: 'message_1',
            body: 'Bonjour {{nom}}',
            richContent: {
              conversation: [
                {
                  text: 'Choisissez',
                  suggestions: [
                    { action: 'Reply', label: 'Aide', postbackdata: 'aide' },
                    { action: 'Reply', label: 'Terminer', postbackdata: 'fin' }
                  ]
                }
              ]
            },
            transitions: { aide: 'message_2', fin: null }
          },
          {
            id: 'message_2',
            body: 'Nous vous rappelons',
            richContent: { conversation: [{ text: 'Fin' }] },
            transitions: {}
          }
        ]
      }
    } satisfies BulkOperationDefinition
    expect(BulkOperationDefinitionSchema.parse(definition)).toEqual(definition)
    const invalid = {
      ...structuredClone(definition),
      delivery: {
        ...structuredClone(definition.delivery),
        nodes: definition.delivery.nodes.map((node, index) =>
          index === 0
            ? {
                ...node,
                richContent: {
                  suggestions: [{ action: 'Reply', label: 'Aide', postbackdata: '{{nom}}' }]
                },
                transitions: { '{{nom}}': 'message_2' }
              }
            : node
        )
      }
    }
    expect(() => BulkOperationDefinitionSchema.parse(invalid)).toThrow(/placeholders/)
  })

  it('rejects unreachable and backwards rich RCS nodes', () => {
    const definition = emptyBulkOperationDefinition()
    expect(() =>
      BulkOperationDefinitionSchema.parse({
        ...definition,
        delivery: {
          kind: 'rich_rcs',
          action: 'Relancer',
          replyTimeoutHours: 72,
          placeholderBindings: {},
          nodes: [
            {
              id: 'message_1',
              body: 'Un',
              richContent: {},
              transitions: {}
            },
            {
              id: 'message_2',
              body: 'Deux',
              richContent: {},
              transitions: {}
            }
          ]
        }
      })
    ).toThrow(/Unreachable/)
  })

  it('accepts an empty Word draft and rejects an invalid file', () => {
    const definition = emptyBulkOperationDefinition()
    const fileBase64 = Buffer.from([0x50, 0x4b, 0x03, 0x04]).toString('base64')
    const empty = {
      medium: 'courrier' as const,
      action: 'R1',
      filename: '',
      fileBase64: '',
      placeholders: [] as string[],
      placeholderBindings: {},
      summary: ''
    }
    definition.delivery = { kind: 'fallback', steps: [empty] }
    expect(BulkOperationDefinitionSchema.parse(definition)).toEqual(definition)
    const ready = {
      ...empty,
      filename: 'R1.docx',
      fileBase64,
      summary: 'Relance amiable du solde.'
    }
    expect(
      BulkOperationDefinitionSchema.parse({
        ...definition,
        delivery: { kind: 'fallback', steps: [ready] }
      })
    ).toEqual({ ...definition, delivery: { kind: 'fallback', steps: [ready] } })
    expect(
      BulkOperationDefinitionSchema.parse({
        ...definition,
        delivery: { kind: 'fallback', steps: [{ ...ready, summary: '' }] }
      }).delivery
    ).toMatchObject({ steps: [{ summary: '' }] })
    expect(() =>
      BulkOperationDefinitionSchema.parse({
        ...definition,
        delivery: {
          kind: 'fallback',
          steps: [{ ...ready, summary: 'x'.repeat(501) }]
        }
      })
    ).toThrow()
    expect(() =>
      BulkOperationDefinitionSchema.parse({
        ...definition,
        delivery: {
          kind: 'fallback',
          steps: [{ ...ready, fileBase64: 'bm90LWFkb2N4' }]
        }
      })
    ).toThrow()
  })
})
