import { describe, expect, test } from 'bun:test'

import {
  authorInitials,
  databaseTimelineActor,
  parseActivityAuthor
} from '@/shared/lib/timeline/parse-activity-author'

describe('parseActivityAuthor', () => {
  test('parses each known kind and strips the prefix', () => {
    expect(parseActivityAuthor('user:alice')).toEqual({
      kind: 'user',
      id: 'alice',
      label: 'alice'
    })
    expect(parseActivityAuthor('user:alice.martin@bailleur.fr')).toEqual({
      kind: 'user',
      id: 'alice.martin@bailleur.fr',
      label: 'alice.martin@bailleur.fr'
    })
    expect(parseActivityAuthor('agent:repayment.create-plan')).toEqual({
      kind: 'agent',
      id: 'repayment.create-plan',
      label: 'Bot'
    })
    expect(parseActivityAuthor('automation:daily')).toEqual({
      kind: 'automation',
      id: 'daily',
      label: 'daily'
    })
    expect(parseActivityAuthor('system:cleanup')).toEqual({
      kind: 'system',
      id: 'cleanup',
      label: 'cleanup'
    })
    expect(parseActivityAuthor('tenant:LOC-1')).toEqual({
      kind: 'tenant',
      id: 'LOC-1',
      label: 'LOC-1'
    })
    expect(parseActivityAuthor('external:partner')).toEqual({
      kind: 'external',
      id: 'partner',
      label: 'partner'
    })
    expect(parseActivityAuthor('candidate:jean')).toEqual({
      kind: 'candidate',
      id: 'jean',
      label: 'jean'
    })
  })

  test('treats unprefixed and empty authors as unknown', () => {
    expect(parseActivityAuthor('alice')).toEqual({
      kind: 'unknown',
      id: 'alice',
      label: 'alice'
    })
    expect(parseActivityAuthor('')).toEqual({ kind: 'unknown', id: '', label: '' })
    expect(parseActivityAuthor(null)).toEqual({ kind: 'unknown', id: '', label: '' })
    expect(parseActivityAuthor('foo:bar')).toEqual({
      kind: 'unknown',
      id: 'foo:bar',
      label: 'foo:bar'
    })
  })
})

describe('databaseTimelineActor', () => {
  test('labels the synthetic ledger actor', () => {
    expect(databaseTimelineActor()).toEqual({
      kind: 'database',
      id: 'database',
      label: 'Base de données'
    })
  })
})

describe('authorInitials', () => {
  test('uses two letters from a single token', () => {
    expect(authorInitials('alice')).toBe('AL')
    expect(authorInitials('A')).toBe('A')
  })

  test('uses first letters of two tokens', () => {
    expect(authorInitials('alice martin')).toBe('AM')
    expect(authorInitials('alice.martin')).toBe('AM')
  })

  test('uppercases and handles empty', () => {
    expect(authorInitials('  cd  ')).toBe('CD')
    expect(authorInitials('')).toBe('?')
  })
})
