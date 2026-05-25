import { describe, expect, test } from 'bun:test'

import {
  ABOUT_SUBJECT_CARD_OPTIONS,
  isAboutSubjectOption
} from '@/features/about/components/AboutSubjectCards'
import { ABOUT_SUBJECTS } from '@/features/tickets/lib/knowledge-skills'

describe('ABOUT_SUBJECT_CARD_OPTIONS', () => {
  test('covers every about subject once', () => {
    expect(ABOUT_SUBJECT_CARD_OPTIONS.map((o) => o.value)).toEqual([...ABOUT_SUBJECTS])
  })

  test('each option has label and icon metadata', () => {
    for (const option of ABOUT_SUBJECT_CARD_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0)
      expect(option.icon).toBeDefined()
    }
  })
})

describe('isAboutSubjectOption', () => {
  test('accepts valid subject values', () => {
    for (const subject of ABOUT_SUBJECTS) {
      expect(isAboutSubjectOption(subject)).toBe(true)
    }
  })

  test('rejects invalid values', () => {
    expect(isAboutSubjectOption('unknown')).toBe(false)
    expect(isAboutSubjectOption('')).toBe(false)
  })
})
