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

/**
 * The OS-keychain boundary for the stored credential. It lives here, and the
 * `safeStorage` implementation lives in `secret-crypto.ts`, because `electron`
 * resolves to the binary path outside an Electron runtime — importing it from
 * this module would break every test that loads the store.
 *
 * Both directions return `null` instead of throwing: a credential that cannot be
 * encrypted is not written, and one that cannot be decrypted reads back as
 * absent, which the app already treats as "logged out".
 */
export type SecretCrypto = {
  encrypt: (value: string) => string | null
  decrypt: (value: string) => string | null
}

/** No keychain: nothing is persisted rather than persisted in cleartext. */
const unavailableSecretCrypto: SecretCrypto = { encrypt: () => null, decrypt: () => null }

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
 *
 * `crypto` is the keychain used for the stored credential; it defaults to "no
 * keychain", which persists no password at all. Production wires
 * `safeStorageCrypto` in `main.ts`.
 */
export function createSettingsStore(
  settingsPath: string,
  uiSettingsPath: string,
  crypto: SecretCrypto = unavailableSecretCrypto
): SettingsStore {
  const uiWriteQueue = createWriteQueue()

  /**
   * Swaps the in-memory `password` for the on-disk `passwordEnc`. A credential
   * that cannot be encrypted is dropped rather than written in cleartext, and any
   * `passwordEnc` echoed back by a caller is discarded in favour of a fresh one.
   */
  const encodeSettingsDocument = (data: Record<string, unknown>): Record<string, unknown> => {
    const { password, passwordEnc: _stale, ...rest } = data
    if (typeof password !== 'string' || !password) return rest
    const ciphertext = crypto.encrypt(password)
    return ciphertext ? { ...rest, passwordEnc: ciphertext } : rest
  }

  const persistSettingsDocument = (document: unknown): void => {
    ensureParentDirectory(settingsPath)
    writeFileSync(settingsPath, JSON.stringify(document, null, 2), { mode: 0o600 })
    try {
      // `mode` only applies when the file is created, so tighten pre-existing
      // ones too — this file used to be world-readable and holds a credential.
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
      const { password: cleartext, passwordEnc, ...rest } = raw

      // A cleartext `password` wins over any ciphertext beside it: only a build
      // without this migration writes one, and it would have echoed back the
      // `passwordEnc` it read, leaving the ciphertext the older of the two.
      if (typeof cleartext === 'string') {
        if (!cleartext) return rest
        const settings = { ...rest, password: cleartext }
        const encoded = encodeSettingsDocument(settings)
        // Migrate only once the credential is safely encrypted; rewriting the
        // file without it would delete a password the user is still logged in
        // with (a Linux box with no keyring, say).
        if (typeof encoded['passwordEnc'] === 'string') {
          try {
            persistSettingsDocument(encoded)
          } catch (error) {
            logMainError('settings-password-migration', error)
          }
        }
        return settings
      }

      if (typeof passwordEnc !== 'string' || !passwordEnc) return rest
      const password = crypto.decrypt(passwordEnc)
      return password ? { ...rest, password } : rest
    },

    writeSettings: (data) => {
      if (!isRecord(data)) {
        persistSettingsDocument(data)
        return
      }
      const { hasPassword: _hasPassword, ...incoming } = data
      if (typeof incoming.password === 'string') {
        persistSettingsDocument(encodeSettingsDocument(incoming))
        return
      }
      const existing = readJsonFile(settingsPath, null)
      const existingEnc =
        isRecord(existing) && typeof existing.passwordEnc === 'string'
          ? existing.passwordEnc
          : undefined
      const keepCredential =
        Boolean(existingEnc) &&
        (typeof incoming.url === 'string' || typeof incoming.email === 'string')
      persistSettingsDocument(
        keepCredential
          ? { ...encodeSettingsDocument(incoming), passwordEnc: existingEnc }
          : encodeSettingsDocument(incoming)
      )
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
