import {
  parseAutomationsPanelSplit,
  parseUpdatesPanelSplit,
  parseWorkflowTicketsOutputSplit,
  UI_SETTINGS_DEFAULTS
} from '../../src/shared/lib/ui-settings/schema'
import type { SettingsStore } from './settings-store'
import { boundsToPartial, parseWindowBoundsFromSettings, type WindowBounds } from './window-bounds'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function seedMissingUiSettingsDefaults(
  store: SettingsStore,
  windowBounds?: WindowBounds
): void {
  const raw = store.readUiSettingsRaw()

  if (!parseWindowBoundsFromSettings(raw) && windowBounds) {
    void store.patchWindowSerialized(boundsToPartial(windowBounds))
  }

  const workflow = isRecord(raw.workflow) ? raw.workflow : {}
  if (!parseWorkflowTicketsOutputSplit(workflow.ticketsOutputSplit)) {
    void store.patchWorkflowSerialized({
      ticketsOutputSplit: UI_SETTINGS_DEFAULTS.workflow!.ticketsOutputSplit
    })
  }

  if (!parseWorkflowTicketsOutputSplit(workflow.aboutOutputSplit)) {
    void store.patchWorkflowSerialized({
      aboutOutputSplit: UI_SETTINGS_DEFAULTS.workflow!.aboutOutputSplit
    })
  }

  const automations = isRecord(raw.automations) ? raw.automations : {}
  if (!parseAutomationsPanelSplit(automations.panelSplit)) {
    void store.patchAutomationsSerialized({
      panelSplit: UI_SETTINGS_DEFAULTS.automations!.panelSplit
    })
  }

  const updates = isRecord(raw.updates) ? raw.updates : {}
  if (!parseUpdatesPanelSplit(updates.panelSplit)) {
    void store.patchUpdatesSerialized({
      panelSplit: UI_SETTINGS_DEFAULTS.updates!.panelSplit
    })
  }
}
