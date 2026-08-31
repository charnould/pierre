import { describe, expect, it } from 'bun:test'

import type { Activite } from '@/shared/types/activites'

import {
  activityActorDestinataire,
  activityBoostPatch,
  canBoostActivity,
  currentActivityBoost
} from './activity-boost'

function sampleActivity(overrides: Partial<Activite> = {}): Activite {
  return {
    id: 1,
    date_creation: '2026-08-17T10:00:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:bob@exemple.fr',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu: 'Relance',
    ...overrides
  }
}

describe('activityActorDestinataire', () => {
  it('prefixes a bare email', () => {
    expect(activityActorDestinataire('Alice@Exemple.fr')).toBe('user:alice@exemple.fr')
  })

  it('keeps an already prefixed actor', () => {
    expect(activityActorDestinataire('user:bob@exemple.fr')).toBe('user:bob@exemple.fr')
  })
})

describe('canBoostActivity', () => {
  it('allows boosting another collaborator’s action', () => {
    expect(canBoostActivity(sampleActivity(), 'alice@exemple.fr')).toBe(true)
    expect(canBoostActivity(sampleActivity({ type: 'action' }), 'alice@exemple.fr')).toBe(true)
    expect(
      canBoostActivity(sampleActivity({ type: 'courrier', bulk_id: 'bulk-r1' }), 'alice@exemple.fr')
    ).toBe(true)
  })

  it('rejects own actions, system authors and boost notifications', () => {
    expect(canBoostActivity(sampleActivity(), 'bob@exemple.fr')).toBe(false)
    expect(
      canBoostActivity(sampleActivity({ auteur: 'agent:ticket.write-memo' }), 'alice@exemple.fr')
    ).toBe(false)
    expect(canBoostActivity(sampleActivity({ type: 'activity_boost' }), 'alice@exemple.fr')).toBe(
      false
    )
  })
})

describe('currentActivityBoost', () => {
  it('reads the current user’s emoji', () => {
    const mentions = [
      { destinataire: 'user:alice@exemple.fr', lu: true, boost: '👍', inbox: false as const }
    ]
    expect(currentActivityBoost(mentions, 'alice@exemple.fr')).toBe('👍')
    expect(currentActivityBoost(mentions, 'bob@exemple.fr')).toBeUndefined()
  })
})

describe('activityBoostPatch', () => {
  it('builds set_boost', () => {
    expect(activityBoostPatch('👏')).toEqual({ operation: 'set_boost', emoji: '👏' })
    expect(activityBoostPatch(null)).toEqual({ operation: 'set_boost', emoji: null })
  })
})
