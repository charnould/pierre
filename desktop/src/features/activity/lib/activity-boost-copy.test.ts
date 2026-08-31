import { describe, expect, it } from 'bun:test'

import {
  activityBoostNoun,
  formatActivityBoostAction,
  formatActivityBoostBody
} from './activity-boost-copy'

describe('activityBoostNoun', () => {
  it('maps known types and falls back to action', () => {
    expect(activityBoostNoun('note')).toBe('note')
    expect(activityBoostNoun('action')).toBe('action')
    expect(activityBoostNoun('repayment_plan')).toBe('plan d’apurement')
    expect(activityBoostNoun('repayment_tag_change')).toBe('mise à jour des tags')
    expect(activityBoostNoun('activity_boost')).toBe('action')
  })
})

describe('formatActivityBoostBody', () => {
  it('includes the noun and emoji', () => {
    expect(formatActivityBoostBody('note', '👍')).toBe('a boosté votre note 👍')
    expect(formatActivityBoostBody('rcs', '👏')).toBe('a boosté votre RCS 👏')
  })

  it('omits a blank emoji', () => {
    expect(formatActivityBoostBody('note', '  ')).toBe('a boosté votre note')
  })
})

describe('formatActivityBoostAction', () => {
  it('identifies the boosted object with the correct article and emoji', () => {
    expect(formatActivityBoostAction('note', '👍')).toBe('a boosté une note 👍')
    expect(formatActivityBoostAction('rcs', '👏')).toBe('a boosté un RCS 👏')
    expect(formatActivityBoostAction('action', '🔥')).toBe('a boosté une tâche 🔥')
  })

  it('falls back to an activity and omits a blank emoji', () => {
    expect(formatActivityBoostAction('unknown', '  ')).toBe('a boosté une activité')
  })
})
