import { describe, expect, test } from 'bun:test'

import {
  type BulkJobPayload,
  type BulkOutcome,
  emptyBulkOperationDefinition
} from '../../../../shared/bulk-operations'
import {
  parseStoredAutomationConfig,
  parseStoredAutomationState,
  storedAutomationConfig
} from '../../../utils/automations/stored'
import {
  parseStoredDefinition,
  stringifyStoredDefinition
} from '../../../utils/bulk/stored-definition'
import {
  parseStoredOutcome,
  parseStoredPayload,
  storedOutcome,
  stringifyStoredPayload
} from '../../../utils/bulk/stored-job'
import { parseStoredUserPreferences } from '../../../utils/user-preferences-stored'

const camelCaseKeys = (value: unknown, opaque: ReadonlySet<string> = new Set()): string[] => {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap((item) => camelCaseKeys(item, opaque))
  return Object.entries(value).flatMap(([key, child]) => {
    const own = /[A-Z]/.test(key) ? [key] : []
    if (opaque.has(key)) return own
    return [...own, ...camelCaseKeys(child, opaque)]
  })
}

describe('stored JSON', () => {
  test('persists bulk definitions with snake_case keys', () => {
    const stored = JSON.parse(stringifyStoredDefinition(emptyBulkOperationDefinition()))
    expect(stored.bucket_id).toBe('Non traités')
    expect(stored.notify_manager).toBe(false)
    expect(stored.delivery.steps[0].placeholder_bindings).toEqual({})
    expect(camelCaseKeys(stored, new Set(['rich_content', 'values']))).toEqual([])
    expect(() => parseStoredDefinition(emptyBulkOperationDefinition())).toThrow()
  })

  test('persists automation config and user preferences with snake_case keys', () => {
    const stored = storedAutomationConfig({ prompt: 'Impayés', maxReports: 4 })
    expect(stored).toEqual({ prompt: 'Impayés', max_reports: 4 })
    expect(parseStoredAutomationConfig(stored)).toEqual({ prompt: 'Impayés', maxReports: 4 })
    expect(() => parseStoredAutomationConfig({ prompt: 'Impayés', maxReports: 4 })).toThrow()
    expect(
      parseStoredAutomationState({
        type: 'report',
        status: 'scheduled',
        last_run_status: null,
        config: stored
      })
    ).toMatchObject({
      type: 'report',
      status: 'scheduled',
      lastRunStatus: null,
      config: { prompt: 'Impayés', maxReports: 4 }
    })
    expect(() =>
      parseStoredAutomationState({
        type: 'replies',
        status: 'scheduled',
        last_run_status: null,
        config: stored
      })
    ).toThrow()

    expect(parseStoredUserPreferences('{}')).toEqual({
      pinnedAutomationIds: [],
      displayName: null,
      preferredName: null
    })
    expect(() => parseStoredUserPreferences({ displayName: 'Ada' })).toThrow()
    expect(() => parseStoredUserPreferences({ preferredName: 'Ada' })).toThrow()
  })

  test('persists bulk jobs and outcomes with strict snake_case keys', () => {
    const payload: BulkJobPayload = {
      kind: 'fallback',
      row: {
        id_locataire: 'LOC-1',
        id_client: null,
        nom: 'Ada',
        email: null,
        telephone: null,
        adresse: null,
        gestionnaire: null,
        gestionnaire_email: null,
        values: {},
        status: 'eligible',
        route: { kind: 'fallback', medium: 'email', stepIndex: 1 },
        skippedSteps: [{ medium: 'rcs', stepIndex: 0, reasons: [{ code: 'missing_destination' }] }]
      },
      stage: 'attempt',
      stepIndex: 1,
      previousActivityId: 42
    }
    const storedPayload = JSON.parse(stringifyStoredPayload(payload))
    expect(camelCaseKeys(storedPayload, new Set(['values']))).toEqual([])
    expect(parseStoredPayload(storedPayload)).toEqual(payload)
    expect(() => parseStoredPayload({ ...storedPayload, stepIndex: 1 })).toThrow()

    const outcome: BulkOutcome = {
      code: 'no_usable_route',
      skippedSteps: payload.row.skippedSteps,
      activityId: 42,
      created: true
    }
    const stored = storedOutcome(outcome)
    expect(camelCaseKeys(stored)).toEqual([])
    expect(parseStoredOutcome(stored)).toEqual(outcome)
    expect(() => parseStoredOutcome({ code: 'applied', activityId: 42, created: true })).toThrow()
  })
})
