import { beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import {
  runTicketBulk,
  ticketPierreContext,
  ticketPierreTitle,
  ticketTagsAfter
} from './ticket-bulk-action'

describe('ticket bulk action', () => {
  beforeEach(() => {
    loadCustomizationFixture()
  })

  test('ajoute ou retire un tag sans remplacer les autres', () => {
    expect(ticketTagsAfter(['Urgent'], 'add', 'Attente prestataire')).toEqual([
      'Urgent',
      'Attente prestataire'
    ])
    expect(ticketTagsAfter(['Urgent', 'Attente prestataire'], 'remove', 'Urgent')).toEqual([
      'Attente prestataire'
    ])
  })

  test('écrit le panier et laisse inchangée une réclamation déjà dans ce panier', async () => {
    const written: string[] = []
    const result = await runTicketBulk({
      rows: [
        { id_reclamation: 'REQ-1', pierre_bucket: 'non_traitees' },
        { id_reclamation: 'REQ-2', pierre_bucket: 'non_traitees' }
      ],
      action: { kind: 'phase', phase: 'non_traitees' },
      generatedBy: 'alice',
      shouldStop: () => false,
      onProgress: () => {},
      writeActivity: async (activity) => {
        written.push(activity.ref)
        return true
      },
      generate: async () => null
    })

    expect(written).toEqual([])
    expect(result.succeeded).toEqual(['REQ-1', 'REQ-2'])
    expect(result.failed).toEqual([])
  })

  test('enregistre la mission de Pierre sans l’envoyer', async () => {
    const result = await runTicketBulk({
      rows: [{ id_reclamation: 'REQ-1', pierre_bucket: 'non_traitees' }],
      action: { kind: 'pierre', mission: 'reponse', instruction: '' },
      generatedBy: 'alice',
      shouldStop: () => false,
      onProgress: () => {},
      writeActivity: async (activity) => {
        expect(activity.contexte).toBe('tickets')
        expect(activity.type).toBe('artifact.generated')
        expect(activity.contenu).toContain(ticketPierreTitle('reponse'))
        expect(activity.contenu).toContain('"skill":"replies"')
        expect(activity.contenu).toContain('Réponse prête.')
        return true
      },
      generate: async (_id, mission) => {
        expect(mission).toBe(
          ticketPierreContext({ kind: 'pierre', mission: 'reponse', instruction: '' })
        )
        return 'Réponse prête.'
      }
    })

    expect(result.succeeded).toEqual(['REQ-1'])
    expect(result.stopped).toBe(false)
  })
})
