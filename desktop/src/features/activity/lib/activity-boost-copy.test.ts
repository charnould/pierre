import { describe, expect, it } from 'bun:test'

import {
  activityBoostNoun,
  formatActivityBoostAction,
  formatActivityBoostBody
} from './activity-boost-copy'

describe('activityBoostNoun', () => {
  it('maps known types and falls back to action', () => {
    expect(activityBoostNoun('note.published')).toBe('note')
    expect(activityBoostNoun('task.created')).toBe('tâche')
    expect(activityBoostNoun('repayment_plan.created')).toBe('plan d’apurement')
    expect(activityBoostNoun('case.tags_changed')).toBe('mise à jour des tags')
    expect(activityBoostNoun('activity.reaction_changed')).toBe('action')
  })
})

describe('formatActivityBoostBody', () => {
  it('includes the noun and emoji', () => {
    expect(formatActivityBoostBody('note.published', '👍')).toBe('a boosté votre note 👍')
    expect(formatActivityBoostBody('communication.sent', '👏')).toBe(
      'a boosté votre communication 👏'
    )
  })

  it('omits a blank emoji', () => {
    expect(formatActivityBoostBody('note.published', '  ')).toBe('a boosté votre note')
  })
})

describe('formatActivityBoostAction', () => {
  it('identifies the boosted object with the correct article and emoji', () => {
    expect(formatActivityBoostAction('note.published', '👍')).toBe('a boosté une note 👍')
    expect(formatActivityBoostAction('communication.sent', '👏')).toBe(
      'a boosté une communication 👏'
    )
    expect(formatActivityBoostAction('task.created', '🔥')).toBe('a boosté une tâche 🔥')
  })

  it('falls back to an activity and omits a blank emoji', () => {
    expect(formatActivityBoostAction('unknown', '  ')).toBe('a boosté une activité')
  })
})
