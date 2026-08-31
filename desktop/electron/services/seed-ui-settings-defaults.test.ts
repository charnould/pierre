import { describe, expect, it } from 'bun:test'

import {
  AUTOMATIONS_SPLIT_DEFAULT_LIST,
  UPDATES_SPLIT_DEFAULT_LIST,
  WORKFLOW_SPLIT_DEFAULT_CONTEXTE
} from '../../src/shared/lib/ui-settings/schema'
import { seedUiSettingsDocument } from './seed-ui-settings-defaults'

describe('seedUiSettingsDocument', () => {
  it('drops unknown keys and fills missing splits', () => {
    const seeded = seedUiSettingsDocument({
      sidebar: { collapsed: true },
      tickets: { table: { columnOrder: ['motif'] } }
    })

    expect(seeded.sidebar).toBeUndefined()
    expect(seeded.tickets).toEqual({ table: { columnOrder: ['motif'] } })
    expect(seeded.workflow).toEqual({
      ticketsOutputSplit: { contextePercent: WORKFLOW_SPLIT_DEFAULT_CONTEXTE },
      aboutOutputSplit: { contextePercent: WORKFLOW_SPLIT_DEFAULT_CONTEXTE }
    })
    expect(seeded.automations).toEqual({
      panelSplit: { listPercent: AUTOMATIONS_SPLIT_DEFAULT_LIST }
    })
    expect(seeded.updates).toEqual({
      panelSplit: { listPercent: UPDATES_SPLIT_DEFAULT_LIST }
    })
  })

  it('keeps existing splits and seeds window bounds when missing', () => {
    const seeded = seedUiSettingsDocument(
      {
        workflow: { ticketsOutputSplit: { contextePercent: 40 } },
        automations: { panelSplit: { listPercent: 32 } }
      },
      { width: 1280, height: 900, x: 12, y: 24 }
    )

    expect(seeded.window).toEqual({ width: 1280, height: 900, x: 12, y: 24 })
    expect(seeded.workflow).toEqual({
      ticketsOutputSplit: { contextePercent: 40 },
      aboutOutputSplit: { contextePercent: WORKFLOW_SPLIT_DEFAULT_CONTEXTE }
    })
    expect(seeded.automations).toEqual({ panelSplit: { listPercent: 32 } })
  })

  it('does not overwrite a persisted window', () => {
    const seeded = seedUiSettingsDocument(
      { window: { width: 1400, height: 950, x: 5, y: 6 } },
      { width: 1280, height: 900 }
    )

    expect(seeded.window).toEqual({ width: 1400, height: 950, x: 5, y: 6 })
  })
})
