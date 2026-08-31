import {
  parseAutomationsPanelSplit,
  parseUiSettings,
  parseUpdatesPanelSplit,
  parseWorkflowTicketsOutputSplit,
  UI_SETTINGS_DEFAULTS
} from '../../src/shared/lib/ui-settings/schema'
import type { SettingsStore } from './settings-store'
import { boundsToPartial, parseWindowBoundsFromSettings, type WindowBounds } from './window-bounds'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Builds the document to persist on launch: known keys from `raw`, plus missing
 * window / split defaults. Unknown keys are dropped.
 */
export function seedUiSettingsDocument(
  raw: Record<string, unknown>,
  windowBounds?: WindowBounds
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...parseUiSettings(raw) }

  if (!parseWindowBoundsFromSettings(next) && windowBounds) {
    next.window = boundsToPartial(windowBounds)
  }

  const workflow = isRecord(next.workflow) ? { ...next.workflow } : {}
  if (!parseWorkflowTicketsOutputSplit(workflow.ticketsOutputSplit)) {
    workflow.ticketsOutputSplit = UI_SETTINGS_DEFAULTS.workflow!.ticketsOutputSplit
  }
  if (!parseWorkflowTicketsOutputSplit(workflow.aboutOutputSplit)) {
    workflow.aboutOutputSplit = UI_SETTINGS_DEFAULTS.workflow!.aboutOutputSplit
  }
  if (Object.keys(workflow).length > 0) next.workflow = workflow

  const automations = isRecord(next.automations) ? { ...next.automations } : {}
  if (!parseAutomationsPanelSplit(automations.panelSplit)) {
    automations.panelSplit = UI_SETTINGS_DEFAULTS.automations!.panelSplit
  }
  if (Object.keys(automations).length > 0) next.automations = automations

  const updates = isRecord(next.updates) ? { ...next.updates } : {}
  if (!parseUpdatesPanelSplit(updates.panelSplit)) {
    updates.panelSplit = UI_SETTINGS_DEFAULTS.updates!.panelSplit
  }
  if (Object.keys(updates).length > 0) next.updates = updates

  return next
}

export function seedMissingUiSettingsDefaults(
  store: SettingsStore,
  windowBounds?: WindowBounds
): Promise<void> {
  return store
    .writeUiSettingsSerialized(seedUiSettingsDocument(store.readUiSettingsRaw(), windowBounds))
    .then(() => undefined)
}
