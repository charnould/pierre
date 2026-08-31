import { describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import {
  DEFAULT_MASCOT_SETTINGS,
  resolveUiSettingsFromRaw,
  type UiSettings
} from '../../src/shared/lib/ui-settings/schema'
import { seedMissingUiSettingsDefaults } from './seed-ui-settings-defaults'
import { createSettingsStore, type SecretCrypto, type SettingsStore } from './settings-store'

describe('createSettingsStore integration', () => {
  it('serializes concurrent table patches without losing keys', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-settings-'))
    const uiPath = join(dir, 'ui-settings.json')
    const store = createSettingsStore(join(dir, 'settings.json'), uiPath)

    await Promise.all([
      store.patchTicketsTableSerialized({ hiddenColumns: ['motif'] }),
      store.patchTicketsTableSerialized({ columnOrder: ['id_reclamation', 'motif'] })
    ])

    const raw = JSON.parse(readFileSync(uiPath, 'utf-8')) as {
      tickets?: { table?: { hiddenColumns?: string[]; columnOrder?: string[] } }
    }

    expect(raw.tickets?.table?.hiddenColumns).toEqual(['motif'])
    expect(raw.tickets?.table?.columnOrder).toEqual(['id_reclamation', 'motif'])

    rmSync(dir, { recursive: true, force: true })
  })

  it('serializes a full save after patch without dropping columnValues', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-settings-'))
    const uiPath = join(dir, 'ui-settings.json')
    const store = createSettingsStore(join(dir, 'settings.json'), uiPath)

    const document = {
      tickets: {
        table: {
          columnValues: {
            avancement: {
              'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
            }
          },
          columnOrder: ['id_reclamation']
        }
      }
    }

    await store.writeUiSettingsSerialized({
      tickets: {
        table: {
          columnValues: {
            avancement: {
              'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
            }
          }
        }
      }
    })
    await store.writeUiSettingsSerialized(document)

    const raw = JSON.parse(readFileSync(uiPath, 'utf-8')) as {
      tickets?: {
        table?: {
          columnOrder?: string[]
          columnValues?: Record<string, unknown>
        }
      }
    }

    expect(raw.tickets?.table?.columnOrder).toEqual(['id_reclamation'])
    expect(raw.tickets?.table?.columnValues?.avancement).toBeDefined()
    expect(readFileSync(uiPath, 'utf-8').endsWith('\n')).toBe(true)

    rmSync(dir, { recursive: true, force: true })
  })

  it('replaces the document on save, so omitted keys are removed', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-settings-'))
    const uiPath = join(dir, 'ui-settings.json')
    const store = createSettingsStore(join(dir, 'settings.json'), uiPath)

    await store.writeUiSettingsSerialized({
      tickets: {
        table: {
          columnValues: {
            avancement: {
              'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
            }
          }
        }
      },
      workflow: { ticketsOutputSplit: { contextePercent: 40 } }
    })
    await store.writeUiSettingsSerialized({
      tickets: { table: { columnOrder: ['id_reclamation'] } }
    })

    const raw = JSON.parse(readFileSync(uiPath, 'utf-8')) as Record<string, unknown>
    expect(raw).toEqual({
      tickets: { table: { columnOrder: ['id_reclamation'] } }
    })

    rmSync(dir, { recursive: true, force: true })
  })

  it('clears columnFilters when patch sends an empty object', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-settings-'))
    const uiPath = join(dir, 'ui-settings.json')
    const store = createSettingsStore(join(dir, 'settings.json'), uiPath)

    await store.patchTicketsTableSerialized({
      columnFilters: { avancement: ['travaux commandés'] }
    })
    const settings = await store.patchTicketsTableSerialized({ columnFilters: {} })

    const raw = JSON.parse(readFileSync(uiPath, 'utf-8')) as {
      tickets?: { table?: { columnFilters?: Record<string, string[]> } }
    }

    expect(raw.tickets?.table?.columnFilters).toBeUndefined()
    expect(settings.tickets?.table?.columnFilters).toBeUndefined()

    rmSync(dir, { recursive: true, force: true })
  })

  it('persists automations panel split across read/write', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-settings-'))
    const uiPath = join(dir, 'ui-settings.json')
    const store = createSettingsStore(join(dir, 'settings.json'), uiPath)

    const settings = await store.patchAutomationsSerialized({
      panelSplit: { listPercent: 40 }
    })

    expect(settings.automations?.panelSplit).toEqual({ listPercent: 40 })

    const raw = JSON.parse(readFileSync(uiPath, 'utf-8')) as {
      automations?: { panelSplit?: { listPercent?: number } }
    }
    expect(raw.automations?.panelSplit).toEqual({ listPercent: 40 })

    rmSync(dir, { recursive: true, force: true })
  })

  it('persists window bounds without dropping other sections', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-settings-'))
    const uiPath = join(dir, 'ui-settings.json')
    const store = createSettingsStore(join(dir, 'settings.json'), uiPath)

    await store.patchTicketsTableSerialized({ columnOrder: ['id_reclamation'] })
    const settings = await store.patchWindowSerialized({
      width: 1280,
      height: 900,
      x: 120,
      y: 80
    })

    expect(settings.window).toEqual({
      width: 1280,
      height: 900,
      x: 120,
      y: 80
    })

    const raw = JSON.parse(readFileSync(uiPath, 'utf-8')) as {
      window?: { width?: number; height?: number; x?: number; y?: number }
      tickets?: { table?: { columnOrder?: string[] } }
    }
    expect(raw.window).toEqual({
      width: 1280,
      height: 900,
      x: 120,
      y: 80
    })
    expect(raw.tickets?.table?.columnOrder).toEqual(['id_reclamation'])

    rmSync(dir, { recursive: true, force: true })
  })

  it('persists updates panel split without dropping other sections', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-settings-'))
    const uiPath = join(dir, 'ui-settings.json')
    const store = createSettingsStore(join(dir, 'settings.json'), uiPath)

    await store.patchWorkflowSerialized({
      ticketsOutputSplit: { contextePercent: 28 }
    })
    const settings = await store.patchUpdatesSerialized({
      panelSplit: { listPercent: 28 }
    })

    expect(settings.updates?.panelSplit).toEqual({ listPercent: 28 })

    const raw = JSON.parse(readFileSync(uiPath, 'utf-8')) as {
      updates?: { panelSplit?: { listPercent?: number } }
      workflow?: { ticketsOutputSplit?: { contextePercent?: number } }
    }
    expect(raw.updates?.panelSplit).toEqual({ listPercent: 28 })
    expect(raw.workflow?.ticketsOutputSplit).toEqual({ contextePercent: 28 })

    rmSync(dir, { recursive: true, force: true })
  })

  it('persists tickets and about workflow splits independently', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-settings-'))
    const uiPath = join(dir, 'ui-settings.json')
    const store = createSettingsStore(join(dir, 'settings.json'), uiPath)

    await store.patchWorkflowSerialized({
      ticketsOutputSplit: { contextePercent: 40 }
    })
    await store.patchWorkflowSerialized({
      aboutOutputSplit: { contextePercent: 55 }
    })

    const raw = JSON.parse(readFileSync(uiPath, 'utf-8')) as {
      workflow?: {
        ticketsOutputSplit?: { contextePercent?: number }
        aboutOutputSplit?: { contextePercent?: number }
      }
    }
    expect(raw.workflow?.ticketsOutputSplit).toEqual({ contextePercent: 40 })
    expect(raw.workflow?.aboutOutputSplit).toEqual({ contextePercent: 55 })

    rmSync(dir, { recursive: true, force: true })
  })

  it('clears obsolete keys when saving an empty ui-settings document', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-settings-'))
    const uiPath = join(dir, 'ui-settings.json')
    const store = createSettingsStore(join(dir, 'settings.json'), uiPath)

    await store.writeUiSettingsSerialized({
      tickets: {
        table: {
          columnValues: {
            avancement: {
              'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
            }
          }
        }
      },
      sidebar: { collapsed: true }
    })

    await store.writeUiSettingsSerialized({})

    const raw = JSON.parse(readFileSync(uiPath, 'utf-8')) as Record<string, unknown>
    expect(raw).toEqual({})

    rmSync(dir, { recursive: true, force: true })
  })

  it('resets ui-settings.json to factory defaults without merging prior state', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-settings-'))
    const uiPath = join(dir, 'ui-settings.json')
    const store = createSettingsStore(join(dir, 'settings.json'), uiPath)

    await store.patchTicketsTableSerialized({ columnOrder: ['id_reclamation', 'motif'] })
    await store.patchWorkflowSerialized({
      ticketsOutputSplit: { contextePercent: 40 }
    })

    const settings = await store.resetUiSettingsSerialized()

    const raw = JSON.parse(readFileSync(uiPath, 'utf-8')) as Record<string, unknown>
    expect(raw).toEqual({})
    expect(settings.tickets?.table?.columnOrder).toBeUndefined()

    rmSync(dir, { recursive: true, force: true })
  })
})

/**
 * Round-trips every persisted section through a real file, because the failure
 * this guards against — a section quietly stopping being written — is invisible
 * until the user restarts. Read-back goes through `resolveUiSettingsFromRaw`,
 * which is what the `ui-settings:get` handler calls on launch.
 */
type RoundTripCase = {
  section: string
  patch: (store: SettingsStore) => Promise<UiSettings>
  /** Every field the patch sent, as it must read back after a "restart". */
  persisted: Record<string, unknown>
  read: (settings: UiSettings) => unknown
  /**
   * Exact top-level keys of the file, in order. `parseUiSettings` omits empty
   * sections, so a first patch of one section writes only that section.
   */
  fileKeys: string[]
}

const CUSTOM_COLUMN_VALUES = {
  my_col: { 'my value': { bgColor: '#ABCDEF', textColor: '#123456' } }
}

const ROUND_TRIP_CASES: RoundTripCase[] = [
  {
    section: 'tickets.table',
    patch: (store) =>
      store.patchTicketsTableSerialized({
        columnOrder: ['id_reclamation', 'motif'],
        hiddenColumns: ['description'],
        pinnedColumns: ['id_reclamation'],
        columnWidths: { motif: 240 },
        columnFilters: { motif: ['fuite'] },
        columnLabels: { motif: 'Motif' },
        columnValueBadge: { fontWeight: 600, textColor: '#FFFFFF' },
        columnValues: CUSTOM_COLUMN_VALUES
      }),
    persisted: {
      columnOrder: ['id_reclamation', 'motif'],
      hiddenColumns: ['description'],
      pinnedColumns: ['id_reclamation'],
      columnWidths: { motif: 240 },
      columnFilters: { motif: ['fuite'] },
      columnLabels: { motif: 'Motif' },
      columnValueBadge: { fontWeight: 600, textColor: '#FFFFFF' },
      columnValues: CUSTOM_COLUMN_VALUES
    },
    read: (settings) => settings.tickets?.table,
    fileKeys: ['tickets']
  },
  {
    section: 'workflow',
    patch: (store) =>
      store.patchWorkflowSerialized({
        ticketsOutputSplit: { contextePercent: 40 },
        aboutOutputSplit: { contextePercent: 55 }
      }),
    persisted: {
      ticketsOutputSplit: { contextePercent: 40 },
      aboutOutputSplit: { contextePercent: 55 }
    },
    read: (settings) => settings.workflow,
    fileKeys: ['workflow']
  },
  {
    section: 'automations',
    patch: (store) => store.patchAutomationsSerialized({ panelSplit: { listPercent: 40 } }),
    persisted: { panelSplit: { listPercent: 40 } },
    read: (settings) => settings.automations,
    fileKeys: ['automations']
  },
  {
    section: 'updates',
    patch: (store) => store.patchUpdatesSerialized({ panelSplit: { listPercent: 42 } }),
    persisted: { panelSplit: { listPercent: 42 } },
    read: (settings) => settings.updates,
    fileKeys: ['updates']
  },
  {
    section: 'window',
    patch: (store) => store.patchWindowSerialized({ width: 1280, height: 900, x: 120, y: 80 }),
    persisted: { width: 1280, height: 900, x: 120, y: 80 },
    read: (settings) => settings.window,
    fileKeys: ['window']
  },
  {
    section: 'mascot',
    patch: (store) => store.patchMascotSerialized({ enabled: false, x: 11, y: 22 }),
    persisted: {
      ...DEFAULT_MASCOT_SETTINGS,
      enabled: false,
      x: 11,
      y: 22
    },
    read: (settings) => settings.mascot,
    fileKeys: ['mascot']
  }
]

/** A document as the current code leaves it once every section has been used. */
const POPULATED_DOCUMENT: Record<string, unknown> = {
  window: { width: 1400, height: 950, x: 5, y: 6 },
  mascot: { enabled: true, x: 33, y: 44 },
  tickets: {
    table: {
      columnLabels: { motif: 'Motif' },
      columnOrder: ['id_reclamation', 'motif'],
      hiddenColumns: ['description'],
      pinnedColumns: ['id_reclamation'],
      columnWidths: { motif: 200 },
      columnFilters: { motif: ['fuite'] },
      columnValueBadge: { fontWeight: 500, textColor: '#FFFFFF' },
      columnValues: { avancement: { 'en cours': { bgColor: '#B5C2F4', textColor: '#2A40A0' } } }
    }
  },
  workflow: {
    ticketsOutputSplit: { contextePercent: 30 },
    aboutOutputSplit: { contextePercent: 31 }
  },
  automations: { panelSplit: { listPercent: 32 } },
  updates: { panelSplit: { listPercent: 34 } }
}

function setupUiSettings() {
  const dir = mkdtempSync(join(tmpdir(), 'pierre-ui-roundtrip-'))
  const uiPath = join(dir, 'ui-settings.json')
  return {
    uiPath,
    store: createSettingsStore(join(dir, 'settings.json'), uiPath),
    cleanup: () => rmSync(dir, { recursive: true, force: true })
  }
}

describe('ui-settings persistence round-trip', () => {
  for (const testCase of ROUND_TRIP_CASES) {
    describe(testCase.section, () => {
      it('reads back every field it wrote', async () => {
        const { store, cleanup } = setupUiSettings()

        await testCase.patch(store)
        const reloaded = resolveUiSettingsFromRaw(store.readUiSettingsRaw())

        expect(testCase.read(reloaded)).toEqual(testCase.persisted)

        cleanup()
      })

      it('returns the same section it persisted', async () => {
        const { store, cleanup } = setupUiSettings()

        const returned = await testCase.patch(store)

        expect(testCase.read(returned)).toEqual(testCase.persisted)

        cleanup()
      })

      it('writes the document shape the current code writes', async () => {
        const { store, uiPath, cleanup } = setupUiSettings()

        await testCase.patch(store)
        const content = readFileSync(uiPath, 'utf-8')

        expect(Object.keys(JSON.parse(content) as Record<string, unknown>)).toEqual(
          testCase.fileKeys
        )
        expect(content.endsWith('\n')).toBe(true)

        cleanup()
      })

      it('leaves every other section of an existing file intact', async () => {
        const { store, uiPath, cleanup } = setupUiSettings()
        writeFileSync(uiPath, `${JSON.stringify(POPULATED_DOCUMENT, null, 2)}\n`)

        await testCase.patch(store)
        const raw = store.readUiSettingsRaw()
        const owned = testCase.section.split('.')[0]

        for (const key of Object.keys(POPULATED_DOCUMENT)) {
          if (key === owned) continue
          expect(raw[key]).toEqual(POPULATED_DOCUMENT[key])
        }

        cleanup()
      })
    })
  }

  it('keeps every section written in the same session', async () => {
    const { store, cleanup } = setupUiSettings()

    await store.patchTicketsTableSerialized({ columnOrder: ['id_reclamation'] })
    await store.patchWorkflowSerialized({ ticketsOutputSplit: { contextePercent: 44 } })
    await store.patchAutomationsSerialized({ panelSplit: { listPercent: 45 } })
    await store.patchUpdatesSerialized({ panelSplit: { listPercent: 44 } })
    await store.patchWindowSerialized({ width: 1300, height: 910 })
    await store.patchMascotSerialized({ enabled: false, x: 7 })

    const reloaded = resolveUiSettingsFromRaw(store.readUiSettingsRaw())

    expect(reloaded.tickets?.table?.columnOrder).toEqual(['id_reclamation'])
    expect(reloaded.workflow?.ticketsOutputSplit).toEqual({ contextePercent: 44 })
    expect(reloaded.automations?.panelSplit).toEqual({ listPercent: 45 })
    expect(reloaded.updates?.panelSplit).toEqual({ listPercent: 44 })
    expect(reloaded.window).toEqual({ width: 1300, height: 910 })
    expect(reloaded.mascot).toEqual({
      ...DEFAULT_MASCOT_SETTINGS,
      enabled: false,
      x: 7
    })

    cleanup()
  })

  it('reads every field of a document written by the previous version', async () => {
    const { store, uiPath, cleanup } = setupUiSettings()
    writeFileSync(uiPath, `${JSON.stringify(POPULATED_DOCUMENT, null, 2)}\n`)

    const reloaded = resolveUiSettingsFromRaw(store.readUiSettingsRaw())

    expect(reloaded.window).toEqual({ width: 1400, height: 950, x: 5, y: 6 })
    expect(reloaded.mascot).toEqual({
      ...DEFAULT_MASCOT_SETTINGS,
      enabled: true,
      x: 33,
      y: 44
    })
    expect(reloaded.tickets?.table).toEqual({
      columnLabels: { motif: 'Motif' },
      columnOrder: ['id_reclamation', 'motif'],
      hiddenColumns: ['description'],
      pinnedColumns: ['id_reclamation'],
      columnWidths: { motif: 200 },
      columnFilters: { motif: ['fuite'] },
      columnValueBadge: { fontWeight: 500, textColor: '#FFFFFF' },
      columnValues: { avancement: { 'en cours': { bgColor: '#B5C2F4', textColor: '#2A40A0' } } }
    })
    expect(reloaded.workflow).toEqual({
      ticketsOutputSplit: { contextePercent: 30 },
      aboutOutputSplit: { contextePercent: 31 }
    })
    expect(reloaded.automations).toEqual({ panelSplit: { listPercent: 32 } })
    expect(reloaded.updates).toEqual({ panelSplit: { listPercent: 34 } })

    cleanup()
  })

  it('drops keys outside the contract when patching a leftover document', async () => {
    const { store, uiPath, cleanup } = setupUiSettings()
    writeFileSync(
      uiPath,
      `${JSON.stringify(
        {
          ...POPULATED_DOCUMENT,
          markdown: {
            panelSplit: { listPercent: 36 },
            rootPath: '/tmp/n',
            lastOpenFile: '/tmp/n/a.md'
          },
          sidebar: { collapsed: true }
        },
        null,
        2
      )}\n`
    )

    await store.patchMascotSerialized({ enabled: true })
    const raw = store.readUiSettingsRaw()

    expect(raw.markdown).toBeUndefined()
    expect(raw.sidebar).toBeUndefined()
    expect(raw.window).toEqual(POPULATED_DOCUMENT.window)
    expect(raw.tickets).toEqual(POPULATED_DOCUMENT.tickets)
    expect(raw.workflow).toEqual(POPULATED_DOCUMENT.workflow)

    cleanup()
  })

  it('rewrites leftover keys out of the file on seed', async () => {
    const { store, uiPath, cleanup } = setupUiSettings()
    writeFileSync(
      uiPath,
      `${JSON.stringify(
        {
          ...POPULATED_DOCUMENT,
          markdown: { rootPath: '/tmp/n' },
          sidebar: { collapsed: true }
        },
        null,
        2
      )}\n`
    )

    await seedMissingUiSettingsDefaults(store)
    const raw = store.readUiSettingsRaw()

    expect(raw.markdown).toBeUndefined()
    expect(raw.sidebar).toBeUndefined()
    expect(raw.window).toEqual(POPULATED_DOCUMENT.window)
    expect(raw.mascot).toEqual(POPULATED_DOCUMENT.mascot)
    expect(raw.tickets).toEqual(POPULATED_DOCUMENT.tickets)

    cleanup()
  })
})

/** Obviously-fake stand-in for the credential under test. */
const FAKE_PASSWORD = 'not-a-real-password-0000'

/**
 * Stands in for the OS keychain: reversible, recognisably not the plaintext, and
 * rejecting anything truncated or malformed the way `safeStorage` does.
 */
const reversibleCrypto: SecretCrypto = {
  encrypt: (value) => `enc:${Buffer.from(value, 'utf-8').toString('base64')}`,
  decrypt: (value) => {
    if (!value.startsWith('enc:')) return null
    const payload = value.slice(4)
    const decoded = Buffer.from(payload, 'base64')
    if (decoded.toString('base64') !== payload) return null
    return decoded.toString('utf-8')
  }
}

/** Stands in for a machine with no keyring. */
const noCrypto: SecretCrypto = { encrypt: () => null, decrypt: () => null }

function setupSettings(crypto: SecretCrypto) {
  const dir = mkdtempSync(join(tmpdir(), 'pierre-settings-'))
  const settingsPath = join(dir, 'settings.json')
  return {
    settingsPath,
    store: createSettingsStore(settingsPath, join(dir, 'ui-settings.json'), crypto),
    readRaw: () => JSON.parse(readFileSync(settingsPath, 'utf-8')) as Record<string, unknown>,
    writeRaw: (doc: Record<string, unknown>) =>
      writeFileSync(settingsPath, JSON.stringify(doc, null, 2)),
    cleanup: () => rmSync(dir, { recursive: true, force: true })
  }
}

describe('createSettingsStore credential at rest', () => {
  it('writes the credential as ciphertext and never as cleartext', () => {
    const { store, settingsPath, readRaw, cleanup } = setupSettings(reversibleCrypto)

    store.writeSettings({
      url: 'https://example.test',
      email: 'agent@example.test',
      password: FAKE_PASSWORD,
      loggedOut: false
    })

    const raw = readRaw()
    expect(raw['password']).toBeUndefined()
    expect(typeof raw['passwordEnc']).toBe('string')
    expect(raw['url']).toBe('https://example.test')

    const bytes = readFileSync(settingsPath, 'utf-8')
    expect(bytes).not.toContain(FAKE_PASSWORD)

    cleanup()
  })

  it('reads the credential back as a plain password without leaking passwordEnc', () => {
    const { store, cleanup } = setupSettings(reversibleCrypto)

    store.writeSettings({ email: 'agent@example.test', password: FAKE_PASSWORD })
    const settings = store.readSettings()

    expect(settings?.['password']).toBe(FAKE_PASSWORD)
    expect(settings).not.toHaveProperty('passwordEnc')

    cleanup()
  })

  it('migrates a legacy cleartext file on read, keeping the user logged in', () => {
    const { store, settingsPath, readRaw, writeRaw, cleanup } = setupSettings(reversibleCrypto)

    writeRaw({ url: 'https://example.test', password: FAKE_PASSWORD, loggedOut: false })
    const settings = store.readSettings()

    expect(settings?.['password']).toBe(FAKE_PASSWORD)

    const raw = readRaw()
    expect(raw['password']).toBeUndefined()
    expect(typeof raw['passwordEnc']).toBe('string')
    expect(readFileSync(settingsPath, 'utf-8')).not.toContain(FAKE_PASSWORD)

    cleanup()
  })

  it('persists neither field when the keychain is unavailable', () => {
    const { store, readRaw, cleanup } = setupSettings(noCrypto)

    store.writeSettings({ email: 'agent@example.test', password: FAKE_PASSWORD })

    const raw = readRaw()
    expect(raw['password']).toBeUndefined()
    expect(raw['passwordEnc']).toBeUndefined()
    expect(raw['email']).toBe('agent@example.test')

    cleanup()
  })

  it('leaves a legacy cleartext file untouched when the keychain is unavailable', () => {
    const { store, readRaw, writeRaw, cleanup } = setupSettings(noCrypto)

    writeRaw({ url: 'https://example.test', password: FAKE_PASSWORD })
    const settings = store.readSettings()

    // Rewriting here would strip the only copy of a credential the user is still
    // logged in with, so the migration is deferred until a keychain exists.
    expect(settings?.['password']).toBe(FAKE_PASSWORD)
    expect(readRaw()['password']).toBe(FAKE_PASSWORD)

    cleanup()
  })

  it('reads as logged out when the ciphertext cannot be decrypted', () => {
    const { store, writeRaw, cleanup } = setupSettings(reversibleCrypto)

    writeRaw({ url: 'https://example.test', passwordEnc: 'enc:tru', loggedOut: false })
    const settings = store.readSettings()

    expect(settings?.['password']).toBeUndefined()
    expect(settings?.['url']).toBe('https://example.test')

    cleanup()
  })

  it('returns no credential for a file that has none', () => {
    const { store, writeRaw, cleanup } = setupSettings(reversibleCrypto)

    writeRaw({ url: 'https://example.test', updatesNotify: 'all' })
    const settings = store.readSettings()

    expect(settings?.['password']).toBeUndefined()
    expect(settings?.['updatesNotify']).toBe('all')

    cleanup()
  })

  it('treats an empty password as no credential in both directions', () => {
    const { store, readRaw, writeRaw, cleanup } = setupSettings(reversibleCrypto)

    store.writeSettings({ url: 'https://example.test', password: '', loggedOut: true })
    expect(readRaw()['passwordEnc']).toBeUndefined()
    expect(readRaw()['loggedOut']).toBe(true)

    writeRaw({ password: '', loggedOut: true })
    expect(store.readSettings()?.['password']).toBeUndefined()

    cleanup()
  })

  it('prefers a cleartext password over stale ciphertext written beside it', () => {
    const { store, readRaw, writeRaw, cleanup } = setupSettings(reversibleCrypto)

    // The shape an older build leaves behind: it echoes back the passwordEnc it
    // read while saving the freshly typed credential in cleartext.
    writeRaw({
      password: FAKE_PASSWORD,
      passwordEnc: reversibleCrypto.encrypt('a-previous-password-0000'),
      loggedOut: false
    })

    expect(store.readSettings()?.['password']).toBe(FAKE_PASSWORD)
    expect(readRaw()['password']).toBeUndefined()
    expect(store.readSettings()?.['password']).toBe(FAKE_PASSWORD)

    cleanup()
  })

  it('round-trips unknown fields from a newer version untouched', () => {
    const { store, readRaw, writeRaw, cleanup } = setupSettings(reversibleCrypto)

    writeRaw({
      url: 'https://example.test',
      passwordEnc: reversibleCrypto.encrypt(FAKE_PASSWORD),
      futureField: { nested: true }
    })

    const settings = store.readSettings()
    expect(settings?.['futureField']).toEqual({ nested: true })

    store.writeSettings(settings)
    expect(readRaw()['futureField']).toEqual({ nested: true })

    cleanup()
  })

  it('keeps existing ciphertext when the renderer omits password', () => {
    const { store, readRaw, cleanup } = setupSettings(reversibleCrypto)

    store.writeSettings({
      url: 'https://example.test',
      email: 'agent@example.test',
      password: FAKE_PASSWORD
    })
    expect(typeof readRaw()['passwordEnc']).toBe('string')

    store.writeSettings({
      url: 'https://example.test',
      email: 'agent@example.test',
      hasPassword: true,
      updatesReadSlugs: ['hello']
    })
    expect(typeof readRaw()['passwordEnc']).toBe('string')
    expect(readRaw()['hasPassword']).toBeUndefined()
    expect(readRaw()['updatesReadSlugs']).toEqual(['hello'])
    expect(store.readSettings()?.['password']).toBe(FAKE_PASSWORD)

    cleanup()
  })

  it('keeps the settings file unreadable by other accounts', () => {
    const { store, settingsPath, writeRaw, cleanup } = setupSettings(reversibleCrypto)

    writeRaw({ url: 'https://example.test' })
    store.writeSettings({ url: 'https://example.test', password: FAKE_PASSWORD })

    expect(statSync(settingsPath).mode & 0o077).toBe(0)

    cleanup()
  })
})
