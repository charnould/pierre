import { describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { createSettingsStore } from './settings-store'

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

  it('serializes full save after patch without dropping columnValues', async () => {
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
      }
    })
    await store.writeUiSettingsSerialized({
      tickets: { table: { columnOrder: ['id_reclamation'] } }
    })

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
