import { describe, expect, test } from 'bun:test'

import { createProposedPassword } from './UserFormDialog'

describe('createProposedPassword', () => {
  test('creates distinct editable password values with sufficient entropy', () => {
    const first = createProposedPassword()
    const second = createProposedPassword()

    expect(first).toHaveLength(20)
    expect(first).toMatch(/^[a-f0-9]+$/)
    expect(second).not.toBe(first)
  })
})
