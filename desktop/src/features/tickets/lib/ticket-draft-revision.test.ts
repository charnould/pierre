import { describe, expect, test } from 'bun:test'

import { serializeTicketAnswer } from '@/shared/lib/parse-result'

import { resolveDraftVariants } from './draft-variant-parse'
import {
  defaultDraftRevision,
  draftVariantForRevision,
  syncDraftVariantInCache
} from './ticket-draft-revision'

describe('resolveDraftVariants', () => {
  test('parses generated only', () => {
    const variants = resolveDraftVariants({
      generated_output: serializeTicketAnswer({ subject: 'Objet', body: 'Corps généré' }),
      edited_output: null
    })
    expect(variants.hasEdited).toBe(false)
    expect(variants.generated).toEqual({ subject: 'Objet', body: 'Corps généré' })
    expect(variants.edited).toBeNull()
  })

  test('parses both variants', () => {
    const variants = resolveDraftVariants({
      generated_output: serializeTicketAnswer({ subject: 'A', body: 'gen' }),
      edited_output: serializeTicketAnswer({ subject: 'B', body: 'edit' })
    })
    expect(variants.hasEdited).toBe(true)
    expect(variants.edited).toEqual({ subject: 'B', body: 'edit' })
  })
})

describe('defaultDraftRevision', () => {
  test('prefers edited when present', () => {
    const variants = resolveDraftVariants({
      generated_output: 'gen',
      edited_output: 'edit'
    })
    expect(defaultDraftRevision(variants)).toBe('edited')
  })

  test('falls back to generated', () => {
    const variants = resolveDraftVariants({
      generated_output: 'gen',
      edited_output: null
    })
    expect(defaultDraftRevision(variants)).toBe('generated')
  })
})

describe('draftVariantForRevision', () => {
  const variants = resolveDraftVariants({
    generated_output: serializeTicketAnswer({ subject: 'A', body: 'gen' }),
    edited_output: serializeTicketAnswer({ subject: 'B', body: 'edit' })
  })

  test('returns generated', () => {
    expect(draftVariantForRevision(variants, 'generated')).toEqual({
      subject: 'A',
      body: 'gen'
    })
  })

  test('returns edited', () => {
    expect(draftVariantForRevision(variants, 'edited')).toEqual({
      subject: 'B',
      body: 'edit'
    })
  })
})

describe('syncDraftVariantInCache', () => {
  test('updates edited variant', () => {
    const base = resolveDraftVariants({
      generated_output: 'gen',
      edited_output: null
    })
    const next = syncDraftVariantInCache(base, 'edited', { subject: 'S', body: 'new' })
    expect(next.hasEdited).toBe(true)
    expect(next.edited).toEqual({ subject: 'S', body: 'new' })
    expect(next.generated.body).toBe('gen')
  })
})
