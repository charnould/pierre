import { describe, expect, it } from 'bun:test'

import {
  cleanIntakeFields,
  createDraftIntakeField,
  type DraftIntakeField,
  duplicateDraftIntakeField,
  filterAndSortIntakes,
  intakePublicUrl,
  toDraftIntakeFields,
  validateIntakeDraft
} from '@/features/intakes/lib/intake-ui'
import type { IntakeField, IntakeRecord } from '@/shared/types/intakes'

const sampleRecord = (overrides: Partial<IntakeRecord> = {}): IntakeRecord => ({
  id: 'intake-1',
  name: 'Enquête chauffage',
  description: 'Collecte saisonnière',
  tableName: 'enquete_chauffage',
  publishToKnowledge: false,
  owner: 'alice@example.org',
  mentions: ['bob@example.org'],
  token: 'tok-123',
  config: {
    form: {
      title: 'Enquête chauffage',
      fields: [{ type: 'short_text', label: 'Nom', required: true }]
    },
    access: { passwords: [] },
    notifications: { frequency: 'immediate' }
  },
  status: 'published',
  createdAt: '2026-11-01T10:00:00Z',
  publishedAt: '2026-11-02T10:00:00Z',
  closedAt: null,
  lastNotifiedAt: null,
  nextNotifyAt: null,
  submissionCount: 4,
  lastSubmissionAt: '2026-11-20T09:00:00Z',
  lockedColumns: ['nom'],
  ...overrides
})

const draftEntries = (fields: IntakeField[], locked = false): DraftIntakeField[] =>
  toDraftIntakeFields(fields, locked)

describe('intake-ui helpers', () => {
  it('builds public intake URL cleanly', () => {
    expect(intakePublicUrl('https://pierre.example.org/', 'abc')).toBe(
      'https://pierre.example.org/repondre/abc'
    )
    expect(intakePublicUrl('https://pierre.example.org', null)).toBeNull()
  })

  it('filters and sorts intakes', () => {
    const a = sampleRecord({ id: 'a', name: 'Zeta', submissionCount: 1, status: 'draft' })
    const b = sampleRecord({ id: 'b', name: 'Alpha', submissionCount: 10, status: 'published' })

    expect(filterAndSortIntakes([a, b], '', 'name').map((i) => i.id)).toEqual(['b', 'a'])
    expect(filterAndSortIntakes([a, b], '', 'submissions').map((i) => i.id)).toEqual(['b', 'a'])
    expect(filterAndSortIntakes([a, b], '', 'status').map((i) => i.id)).toEqual(['b', 'a'])
    expect(filterAndSortIntakes([a, b], 'zeta', 'name').map((i) => i.id)).toEqual(['a'])
  })

  it('validates reserved table names, reserved columns, duplicates and locked columns', () => {
    expect(
      validateIntakeDraft({
        name: 'Test',
        tableName: 'documents',
        entries: draftEntries([{ type: 'short_text', label: 'Nom' }]),
        isPublished: false,
        lockedColumns: []
      })
    ).toContain('réservé')

    expect(
      validateIntakeDraft({
        name: 'Test',
        tableName: 'sqlite_sequence',
        entries: draftEntries([{ type: 'short_text', label: 'Nom' }]),
        isPublished: false,
        lockedColumns: []
      })
    ).toContain('réservé')

    expect(
      validateIntakeDraft({
        name: 'Test',
        tableName: 'test_table',
        entries: draftEntries([{ type: 'short_text', label: 'id' }]),
        isPublished: false,
        lockedColumns: []
      })
    ).toContain('réservé')

    expect(
      validateIntakeDraft({
        name: 'Test',
        tableName: 'test_table',
        entries: draftEntries([
          { type: 'short_text', label: 'Nom' },
          { type: 'short_text', label: 'nom ' }
        ]),
        isPublished: false,
        lockedColumns: []
      })
    ).toContain('même colonne')

    // Removing a published field and adding a new unlocked field with the same column is rejected.
    expect(
      validateIntakeDraft({
        name: 'Test',
        tableName: 'test_table',
        entries: draftEntries([{ type: 'number', label: 'Nom' }], false),
        isPublished: true,
        lockedColumns: ['nom']
      })
    ).toContain('ne peut pas être réutilisée')

    // Keeping the original locked published field remains valid.
    expect(
      validateIntakeDraft({
        name: 'Test',
        tableName: 'test_table',
        entries: draftEntries([{ type: 'short_text', label: 'Nom' }], true),
        isPublished: true,
        lockedColumns: ['nom', 'ancienne_colonne']
      })
    ).toBeNull()
  })

  it('cleans fields before saving', () => {
    const raw: IntakeField[] = [
      {
        type: 'single_choice',
        label: '  Urgence ',
        description: '  ',
        display: 'radio',
        options: [' Haute ', '', 'Basse']
      }
    ]
    expect(cleanIntakeFields(raw)).toEqual([
      {
        type: 'single_choice',
        label: 'Urgence',
        description: undefined,
        required: false,
        display: 'radio',
        options: ['Haute', 'Basse']
      }
    ])
  })

  it('handles large multiline option lists (150 options), blank lines and duplicates', () => {
    const pasted = Array.from({ length: 150 }, (_, i) => `  Résidence ${i + 1}  `).join('\r\n\r\n')
    const parsedOptions = pasted.split(/\r?\n/)

    expect(
      validateIntakeDraft({
        name: 'Recensement résidences',
        tableName: 'recensement_residences',
        entries: draftEntries([
          {
            type: 'single_choice',
            label: 'Résidence',
            display: 'select',
            options: parsedOptions
          }
        ]),
        isPublished: false,
        lockedColumns: []
      })
    ).toBeNull()

    const cleaned = cleanIntakeFields([
      {
        type: 'single_choice',
        label: 'Résidence',
        display: 'select',
        options: parsedOptions
      }
    ])
    const first = cleaned[0]
    expect(first?.type).toBe('single_choice')
    if (first?.type === 'single_choice') {
      expect(first.options).toHaveLength(150)
      expect(first.options[0]).toBe('Résidence 1')
      expect(first.options[149]).toBe('Résidence 150')
    }

    expect(
      validateIntakeDraft({
        name: 'Doublon',
        tableName: 'doublon_options',
        entries: draftEntries([
          {
            type: 'multiple_choice',
            label: 'Quartiers',
            options: ['Centre', '  ', 'Nord', 'Centre ']
          }
        ]),
        isPublished: false,
        lockedColumns: []
      })
    ).toContain('doublon')
  })

  it('tracks published field lock by entry identity rather than typed label', () => {
    const initial: IntakeField[] = [
      { type: 'section', label: 'Identité' },
      { type: 'short_text', label: 'Nom', required: true }
    ]

    const nonPublished = toDraftIntakeFields(initial, false)
    expect(nonPublished.map((entry) => entry.locked)).toEqual([false, false])

    const publishedEntries = toDraftIntakeFields(initial, true)
    expect(publishedEntries.map((entry) => entry.locked)).toEqual([false, true])

    const added = createDraftIntakeField('short_text')
    added.field.label = 'Nom'
    expect(added.locked).toBe(false)
    expect(new Set([...publishedEntries.map((e) => e.key), added.key]).size).toBe(3)

    const duplicated = duplicateDraftIntakeField(publishedEntries[1]!)
    expect(duplicated.locked).toBe(false)
    expect(duplicated.key).not.toBe(publishedEntries[1]!.key)
    expect(duplicated.field.label).toBe('Nom (copie)')
  })
})
