import { describe, expect, it } from 'bun:test'

import { ListActivitiesQuery as Query } from '../../../../../routes/activities'

describe('GET /activities query', () => {
  it('accepte plus de 50 auteurs suivis', () => {
    const auteurs = Array.from(
      { length: 59 },
      (_, index) => `user:collab${index}@pierre.test`
    ).join(',')
    const parsed = Query.safeParse({ auteurs })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.auteurs).toHaveLength(59)
  })
})
