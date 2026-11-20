import { describe, expect, test } from 'bun:test'

import {
  formatGenerationDate,
  lastGenerationStatusLabel,
  runOutcomeDisplay
} from '@/features/automations/lib/automation-list-display'
import type { Automation } from '@/features/automations/lib/automation-types'
import { COLUMN_VALUE_COLOR_GROUPS } from '@/shared/lib/ui-settings/column-value-palette'
import { colorizeBadgeBorder } from '@/shared/lib/ui-settings/tickets-table'

function report(overrides: Partial<Automation> = {}): Automation {
  return {
    id: 'a1',
    type: 'report' as const,
    name: 'Astreinte',
    description: 'Points d’attention',
    status: 'scheduled',
    owner: 'alice',
    mentions: [],
    canManage: true,
    pinned: false,
    schedule: { frequency: 'weekly', days: [1], hour: 8, minute: 0 },
    prompt: '',
    maxReports: 6,
    runs: [],
    ...overrides
  } as Automation
}

describe('lastGenerationStatusLabel', () => {
  test('maps run outcomes', () => {
    expect(lastGenerationStatusLabel(report({ lastRunStatus: 'success' }))).toBe('Succès')
    expect(lastGenerationStatusLabel(report({ lastRunStatus: 'error' }))).toBe('En échec')
    expect(lastGenerationStatusLabel(report())).toBe('—')
  })
})

describe('runOutcomeDisplay', () => {
  test('maps outcomes to table colorize pills', () => {
    const green = COLUMN_VALUE_COLOR_GROUPS.find((group) => group.id === 'green')?.variants[0]
    const red = COLUMN_VALUE_COLOR_GROUPS.find((group) => group.id === 'red')?.variants[0]
    expect(runOutcomeDisplay(report({ lastRunStatus: 'success' }))).toEqual({
      text: 'Succès',
      badgeStyle: {
        background: green!.bgColor,
        color: green!.textColor,
        border: colorizeBadgeBorder(green!.bgColor, green!.textColor),
        fontWeight: 500
      }
    })
    expect(runOutcomeDisplay(report({ lastRunStatus: 'error' }))).toEqual({
      text: 'En échec',
      badgeStyle: {
        background: red!.bgColor,
        color: red!.textColor,
        border: colorizeBadgeBorder(red!.bgColor, red!.textColor),
        fontWeight: 500
      }
    })
    expect(runOutcomeDisplay(report())).toBeNull()
  })
})

describe('formatGenerationDate', () => {
  test('formats a valid datetime in fr-FR', () => {
    expect(formatGenerationDate('2026-08-17T08:00:00.000Z')).toMatch(/\d{2}\/\d{2}/)
  })

  test('returns an em dash when missing or invalid', () => {
    expect(formatGenerationDate(undefined)).toBe('—')
    expect(formatGenerationDate('not-a-date')).toBe('—')
  })
})
