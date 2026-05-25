import {
  parseUiSettings,
  type AutomationsSettings,
  type TicketsTableSettings,
  type UpdatesSettings,
  type WindowSettings,
  type WorkflowSettings
} from '../../src/shared/lib/ui-settings/schema'

/**
 * Merges a partial `tickets.table` patch into a parsed UI settings document.
 *
 * Pure function — safe to unit test without Electron or filesystem I/O.
 */
export function mergeTicketsTablePatch(
  current: Record<string, unknown>,
  partial: Partial<TicketsTableSettings>
): Record<string, unknown> {
  const currentTickets = (current.tickets as Record<string, unknown> | undefined) ?? {}
  const currentTable = (currentTickets.table as Record<string, unknown> | undefined) ?? {}

  return {
    ...current,
    tickets: {
      ...currentTickets,
      table: {
        ...currentTable,
        ...partial
      }
    }
  }
}

/**
 * Parses raw UI settings and applies a tickets-table patch in one step.
 */
export function parseAndPatchTicketsTable(
  raw: unknown,
  partial: Partial<TicketsTableSettings>
): Record<string, unknown> {
  const base =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  return parseUiSettings(mergeTicketsTablePatch(base, partial)) as Record<string, unknown>
}

export function mergeWorkflowPatch(
  current: Record<string, unknown>,
  partial: Partial<WorkflowSettings>
): Record<string, unknown> {
  const currentWorkflow = (current.workflow as Record<string, unknown> | undefined) ?? {}

  return {
    ...current,
    workflow: {
      ...currentWorkflow,
      ...partial
    }
  }
}

export function parseAndPatchWorkflow(
  raw: unknown,
  partial: Partial<WorkflowSettings>
): Record<string, unknown> {
  const current = parseUiSettings(raw) as Record<string, unknown>
  return parseUiSettings(mergeWorkflowPatch(current, partial)) as Record<string, unknown>
}

export function mergeAutomationsPatch(
  current: Record<string, unknown>,
  partial: Partial<AutomationsSettings>
): Record<string, unknown> {
  const currentAutomations = (current.automations as Record<string, unknown> | undefined) ?? {}

  return {
    ...current,
    automations: {
      ...currentAutomations,
      ...partial
    }
  }
}

export function parseAndPatchAutomations(
  raw: unknown,
  partial: Partial<AutomationsSettings>
): Record<string, unknown> {
  const current = parseUiSettings(raw) as Record<string, unknown>
  return parseUiSettings(mergeAutomationsPatch(current, partial)) as Record<string, unknown>
}

export function mergeUpdatesPatch(
  current: Record<string, unknown>,
  partial: Partial<UpdatesSettings>
): Record<string, unknown> {
  const currentUpdates = (current.updates as Record<string, unknown> | undefined) ?? {}

  return {
    ...current,
    updates: {
      ...currentUpdates,
      ...partial
    }
  }
}

export function parseAndPatchUpdates(
  raw: unknown,
  partial: Partial<UpdatesSettings>
): Record<string, unknown> {
  const current = parseUiSettings(raw) as Record<string, unknown>
  return parseUiSettings(mergeUpdatesPatch(current, partial)) as Record<string, unknown>
}

export function mergeWindowPatch(
  current: Record<string, unknown>,
  partial: Partial<WindowSettings>
): Record<string, unknown> {
  const currentWindow = (current.window as Record<string, unknown> | undefined) ?? {}

  return {
    ...current,
    window: {
      ...currentWindow,
      ...partial
    }
  }
}

export function parseAndPatchWindow(
  raw: unknown,
  partial: Partial<WindowSettings>
): Record<string, unknown> {
  const current = parseUiSettings(raw) as Record<string, unknown>
  return parseUiSettings(mergeWindowPatch(current, partial)) as Record<string, unknown>
}
