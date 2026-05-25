import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { dirname } from 'path'

import {
  buildFactoryUiSettingsDocument,
  formatUiSettingsFileContent,
  mergeUiSettingsRawDocuments,
  parseUiSettings,
  resolveUiSettingsFromRaw,
  type AutomationsSettings,
  type TicketsTableSettings,
  type UiSettings,
  type UpdatesSettings,
  type WindowSettings,
  type WorkflowSettings
} from '../../src/shared/lib/ui-settings/schema'
import { logMainError } from './logging'
import {
  parseAndPatchAutomations,
  parseAndPatchTicketsTable,
  parseAndPatchUpdates,
  parseAndPatchWindow,
  parseAndPatchWorkflow
} from './ui-settings-patch'
import { createWriteQueue } from './write-queue'

/**
 * Minimal read/write wrapper around user settings JSON files.
 */
export type SettingsStore = {
  readSettings: () => Record<string, unknown> | null
  writeSettings: (data: unknown) => void
  readUiSettingsRaw: () => Record<string, unknown>
  readUiSettingsContent: () => string
  /** Serialized write — safe under concurrent IPC from renderer. */
  writeUiSettingsSerialized: (data: unknown) => Promise<UiSettings>
  /** Replaces `ui-settings.json` with factory defaults (`{}`), without merging disk state. */
  resetUiSettingsSerialized: () => Promise<UiSettings>
  /** Serialized patch of `tickets.table` only. */
  patchTicketsTableSerialized: (partial: Partial<TicketsTableSettings>) => Promise<UiSettings>
  /** Serialized patch of `workflow` only. */
  patchWorkflowSerialized: (partial: Partial<WorkflowSettings>) => Promise<UiSettings>
  /** Serialized patch of `automations` only. */
  patchAutomationsSerialized: (partial: Partial<AutomationsSettings>) => Promise<UiSettings>
  /** Serialized patch of `updates` only. */
  patchUpdatesSerialized: (partial: Partial<UpdatesSettings>) => Promise<UiSettings>
  /** Serialized patch of `window` only. */
  patchWindowSerialized: (partial: Partial<WindowSettings>) => Promise<UiSettings>
}

function ensureParentDirectory(path: string): void {
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

function readJsonFile(
  path: string,
  fallback: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>
  } catch (error) {
    logMainError(`read:${path}`, error)
    return fallback
  }
}

/**
 * Creates a file-backed store with a single-writer queue for UI settings.
 */
export function createSettingsStore(settingsPath: string, uiSettingsPath: string): SettingsStore {
  const uiWriteQueue = createWriteQueue()

  const readUiSettingsRaw = (): Record<string, unknown> => readJsonFile(uiSettingsPath, {}) ?? {}

  const writeUiSettingsFile = (data: unknown): UiSettings => {
    ensureParentDirectory(uiSettingsPath)
    const existing = readUiSettingsRaw()
    const mergedInput = mergeUiSettingsRawDocuments(existing, data as Record<string, unknown>)
    const parsed = parseUiSettings(mergedInput)
    writeFileSync(uiSettingsPath, JSON.stringify(parsed, null, 2))
    return resolveUiSettingsFromRaw(mergedInput)
  }

  /** Writes an already-patched document as-is (no re-merge with disk). */
  const replaceUiSettingsFile = (parsed: Record<string, unknown>): UiSettings => {
    ensureParentDirectory(uiSettingsPath)
    const normalized = parseUiSettings(parsed) as Record<string, unknown>
    writeFileSync(uiSettingsPath, formatUiSettingsFileContent(normalized))
    return resolveUiSettingsFromRaw(normalized)
  }

  const writeParsedUiSettings = (parsed: Record<string, unknown>): UiSettings =>
    replaceUiSettingsFile(parsed)

  return {
    readSettings: () => readJsonFile(settingsPath, null),

    writeSettings: (data) => {
      ensureParentDirectory(settingsPath)
      writeFileSync(settingsPath, JSON.stringify(data, null, 2))
    },

    readUiSettingsRaw,
    readUiSettingsContent: () => {
      try {
        return readFileSync(uiSettingsPath, 'utf-8')
      } catch (error) {
        logMainError('read-ui-settings-content', error)
        return '{}\n'
      }
    },

    writeUiSettingsSerialized: (data) => uiWriteQueue.enqueue(() => writeUiSettingsFile(data)),

    resetUiSettingsSerialized: () =>
      uiWriteQueue.enqueue(() => {
        if (existsSync(uiSettingsPath)) {
          unlinkSync(uiSettingsPath)
        }
        return replaceUiSettingsFile(buildFactoryUiSettingsDocument())
      }),

    patchTicketsTableSerialized: (partial) =>
      uiWriteQueue.enqueue(() => {
        try {
          const raw = readUiSettingsRaw()
          const parsed = parseAndPatchTicketsTable(raw, partial)
          return writeParsedUiSettings(parsed)
        } catch (error) {
          logMainError('patch-ui-settings-tickets-table', error)
          return resolveUiSettingsFromRaw(readUiSettingsRaw())
        }
      }),

    patchWorkflowSerialized: (partial) =>
      uiWriteQueue.enqueue(() => {
        try {
          const raw = readUiSettingsRaw()
          const parsed = parseAndPatchWorkflow(raw, partial)
          return writeUiSettingsFile(parsed)
        } catch (error) {
          logMainError('patch-ui-settings-workflow', error)
          return resolveUiSettingsFromRaw(readUiSettingsRaw())
        }
      }),

    patchAutomationsSerialized: (partial) =>
      uiWriteQueue.enqueue(() => {
        try {
          const raw = readUiSettingsRaw()
          const parsed = parseAndPatchAutomations(raw, partial)
          return writeUiSettingsFile(parsed)
        } catch (error) {
          logMainError('patch-ui-settings-automations', error)
          return resolveUiSettingsFromRaw(readUiSettingsRaw())
        }
      }),

    patchUpdatesSerialized: (partial) =>
      uiWriteQueue.enqueue(() => {
        try {
          const raw = readUiSettingsRaw()
          const parsed = parseAndPatchUpdates(raw, partial)
          return writeUiSettingsFile(parsed)
        } catch (error) {
          logMainError('patch-ui-settings-updates', error)
          return resolveUiSettingsFromRaw(readUiSettingsRaw())
        }
      }),

    patchWindowSerialized: (partial) =>
      uiWriteQueue.enqueue(() => {
        try {
          const raw = readUiSettingsRaw()
          const parsed = parseAndPatchWindow(raw, partial)
          return writeParsedUiSettings(parsed)
        } catch (error) {
          logMainError('patch-ui-settings-window', error)
          return resolveUiSettingsFromRaw(readUiSettingsRaw())
        }
      })
  }
}
