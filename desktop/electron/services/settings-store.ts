import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { dirname } from 'path'

import {
  buildFactoryUiSettingsDocument,
  formatUiSettingsFileContent,
  parseUiSettings,
  resolveUiSettingsFromRaw,
  type AutomationsSettings,
  type MascotSettings,
  type TicketsTableSettings,
  type UiSettings,
  type UpdatesSettings,
  type WindowSettings,
  type WorkflowSettings
} from '../../src/shared/lib/ui-settings/schema'
import { logMainError } from './logging'
import {
  parseAndPatchAutomations,
  parseAndPatchMascot,
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
  /**
   * Replaces `ui-settings.json` with the parsed document (not a merge).
   * Serialized — safe under concurrent IPC from the renderer.
   */
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
  /** Serialized patch of `mascot` only. */
  patchMascotSerialized: (partial: Partial<MascotSettings>) => Promise<UiSettings>
}

function ensureParentDirectory(path: string): void {
  const dir = dirname(path)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const SETTINGS_KEYS = [
  'url',
  'email',
  'updatesNotify',
  'updatesReadSlugs',
  'showOwnActivity',
  'followedActivityAuthors'
] as const

function normalizeSettingsDocument(data: unknown): Record<string, unknown> {
  if (!isRecord(data)) return {}
  return Object.fromEntries(
    SETTINGS_KEYS.flatMap((key) => (data[key] === undefined ? [] : [[key, data[key]]]))
  )
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

/** Creates a file-backed store with a single-writer queue for UI settings. */
export function createSettingsStore(settingsPath: string, uiSettingsPath: string): SettingsStore {
  const uiWriteQueue = createWriteQueue()

  const persistSettingsDocument = (document: unknown): void => {
    ensureParentDirectory(settingsPath)
    writeFileSync(settingsPath, JSON.stringify(document, null, 2), { mode: 0o600 })
    try {
      // `mode` only applies when the file is created, so tighten pre-existing
      // ones too — this file used to be world-readable.
      chmodSync(settingsPath, 0o600)
    } catch (error) {
      // The settings are already saved; a filesystem that refuses the mode must
      // not turn into a failed login.
      logMainError('settings-chmod', error)
    }
  }

  const readUiSettingsRaw = (): Record<string, unknown> => readJsonFile(uiSettingsPath, {}) ?? {}

  /** Parses `data` and writes that document as the whole file (trailing newline). */
  const replaceUiSettingsFile = (data: unknown): UiSettings => {
    ensureParentDirectory(uiSettingsPath)
    const normalized = parseUiSettings(data)
    writeFileSync(uiSettingsPath, formatUiSettingsFileContent(normalized))
    return resolveUiSettingsFromRaw(normalized)
  }

  /**
   * Shared scaffolding for the six section patches: serialize against the other
   * writers, patch what is on disk, write the patched document as a replace, and
   * on failure log under the section's own tag and hand back the unchanged
   * document rather than propagating.
   */
  const patchUiSettingsSection = (
    tag: string,
    patch: (raw: Record<string, unknown>) => Record<string, unknown>
  ): Promise<UiSettings> =>
    uiWriteQueue.enqueue(() => {
      try {
        return replaceUiSettingsFile(patch(readUiSettingsRaw()))
      } catch (error) {
        logMainError(tag, error)
        return resolveUiSettingsFromRaw(readUiSettingsRaw())
      }
    })

  return {
    readSettings: () => {
      const raw = readJsonFile(settingsPath, null)
      if (!isRecord(raw)) return raw
      const normalized = normalizeSettingsDocument(raw)
      if (JSON.stringify(normalized) !== JSON.stringify(raw)) persistSettingsDocument(normalized)
      return normalized
    },

    writeSettings: (data) => persistSettingsDocument(normalizeSettingsDocument(data)),

    readUiSettingsRaw,
    readUiSettingsContent: () => {
      try {
        return readFileSync(uiSettingsPath, 'utf-8')
      } catch (error) {
        logMainError('read-ui-settings-content', error)
        return '{}\n'
      }
    },

    writeUiSettingsSerialized: (data) => uiWriteQueue.enqueue(() => replaceUiSettingsFile(data)),

    resetUiSettingsSerialized: () =>
      uiWriteQueue.enqueue(() => {
        if (existsSync(uiSettingsPath)) {
          unlinkSync(uiSettingsPath)
        }
        return replaceUiSettingsFile(buildFactoryUiSettingsDocument())
      }),

    patchTicketsTableSerialized: (partial) =>
      patchUiSettingsSection('patch-ui-settings-tickets-table', (raw) =>
        parseAndPatchTicketsTable(raw, partial)
      ),

    patchWorkflowSerialized: (partial) =>
      patchUiSettingsSection('patch-ui-settings-workflow', (raw) =>
        parseAndPatchWorkflow(raw, partial)
      ),

    patchAutomationsSerialized: (partial) =>
      patchUiSettingsSection('patch-ui-settings-automations', (raw) =>
        parseAndPatchAutomations(raw, partial)
      ),

    patchUpdatesSerialized: (partial) =>
      patchUiSettingsSection('patch-ui-settings-updates', (raw) =>
        parseAndPatchUpdates(raw, partial)
      ),

    patchWindowSerialized: (partial) =>
      patchUiSettingsSection('patch-ui-settings-window', (raw) =>
        parseAndPatchWindow(raw, partial)
      ),

    patchMascotSerialized: (partial) =>
      patchUiSettingsSection('patch-ui-settings-mascot', (raw) => parseAndPatchMascot(raw, partial))
  }
}
