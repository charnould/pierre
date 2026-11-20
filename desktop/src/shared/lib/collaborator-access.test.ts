import { describe, expect, test } from 'bun:test'

import {
  canManageCollaboratorResource,
  sameCollaboratorLogin
} from '@/shared/lib/collaborator-access'

describe('sameCollaboratorLogin', () => {
  test('matches the same canonical email case-insensitively', () => {
    expect(sameCollaboratorLogin('Admin@Pierre.test', 'admin@pierre.test')).toBe(true)
  })

  test('rejects local-part collisions across domains and empty values', () => {
    expect(sameCollaboratorLogin('admin@other.test', 'admin@pierre.test')).toBe(false)
    expect(sameCollaboratorLogin('admin2@pierre.test', 'admin@pierre.test')).toBe(false)
    expect(sameCollaboratorLogin('', '')).toBe(false)
  })
})

describe('canManageCollaboratorResource', () => {
  test('grants management to the owner or an administrator only', () => {
    expect(canManageCollaboratorResource('alice@example.org', 'alice@example.org', false)).toBe(
      true
    )
    expect(canManageCollaboratorResource('alice@example.org', 'bob@example.org', false)).toBe(false)
    expect(canManageCollaboratorResource('alice@example.org', 'bob@example.org', true)).toBe(true)
    expect(canManageCollaboratorResource('', '', false)).toBe(false)
  })
})
