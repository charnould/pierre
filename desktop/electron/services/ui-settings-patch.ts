import {
  parseUiSettings,
  type AutomationsSettings,
  type MascotSettings,
  type TicketsTableSettings,
  type UpdatesSettings,
  type WindowSettings,
  type WorkflowSettings
} from '../../src/shared/lib/ui-settings/schema'

/**
 * Merges a partial section into a UI settings document, leaving every other key
 * of the document — known or not — exactly as it was.
 *
 * Pure function — safe to unit test without Electron or filesystem I/O.
 */
export function mergeSectionPatch(
  current: Record<string, unknown>,
  section: string,
  partial: Record<string, unknown>
): Record<string, unknown> {
  const currentSection = (current[section] as Record<string, unknown> | undefined) ?? {}

  return {
    ...current,
    [section]: {
      ...currentSection,
      ...partial
    }
  }
}

/**
 * Parses raw UI settings, applies a section patch, and re-parses the result, so a
 * patch can never persist a value the schema rejects.
 */
function parseAndPatchSection(
  raw: unknown,
  section: string,
  partial: Record<string, unknown>
): Record<string, unknown> {
  return parseUiSettings(mergeSectionPatch(parseUiSettings(raw), section, partial))
}

/** `tickets.table` is the only section nested two levels deep. */
export function mergeTicketsTablePatch(
  current: Record<string, unknown>,
  partial: Partial<TicketsTableSettings>
): Record<string, unknown> {
  const currentTickets = (current.tickets as Record<string, unknown> | undefined) ?? {}

  return {
    ...current,
    tickets: mergeSectionPatch(currentTickets, 'table', partial)
  }
}

export function parseAndPatchTicketsTable(
  raw: unknown,
  partial: Partial<TicketsTableSettings>
): Record<string, unknown> {
  return parseUiSettings(mergeTicketsTablePatch(parseUiSettings(raw), partial))
}

export function parseAndPatchWorkflow(
  raw: unknown,
  partial: Partial<WorkflowSettings>
): Record<string, unknown> {
  return parseAndPatchSection(raw, 'workflow', partial)
}

export function parseAndPatchAutomations(
  raw: unknown,
  partial: Partial<AutomationsSettings>
): Record<string, unknown> {
  return parseAndPatchSection(raw, 'automations', partial)
}

export function parseAndPatchUpdates(
  raw: unknown,
  partial: Partial<UpdatesSettings>
): Record<string, unknown> {
  return parseAndPatchSection(raw, 'updates', partial)
}

export function parseAndPatchWindow(
  raw: unknown,
  partial: Partial<WindowSettings>
): Record<string, unknown> {
  return parseAndPatchSection(raw, 'window', partial)
}

export function parseAndPatchMascot(
  raw: unknown,
  partial: Partial<MascotSettings>
): Record<string, unknown> {
  return parseAndPatchSection(raw, 'mascot', partial)
}
