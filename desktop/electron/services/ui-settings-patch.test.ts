import { describe, expect, it } from 'bun:test'

import {
  mergeAutomationsPatch,
  mergeTicketsTablePatch,
  mergeUpdatesPatch,
  mergeWindowPatch,
  mergeWorkflowPatch,
  parseAndPatchAutomations,
  parseAndPatchTicketsTable,
  parseAndPatchUpdates,
  parseAndPatchWindow,
  parseAndPatchWorkflow
} from './ui-settings-patch'

describe('mergeTicketsTablePatch', () => {
  it('merges partial table settings without dropping unknown top-level keys', () => {
    const result = mergeTicketsTablePatch(
      {
        chat: { fontSize: 14 },
        tickets: { table: { columnOrder: ['a'], hiddenColumns: ['b'] } }
      },
      { columnFilters: { motif: ['fuite'] } }
    )

    expect(result).toEqual({
      chat: { fontSize: 14 },
      tickets: {
        table: {
          columnOrder: ['a'],
          hiddenColumns: ['b'],
          columnFilters: { motif: ['fuite'] }
        }
      }
    })
  })

  it('overwrites table keys present in the partial', () => {
    const result = mergeTicketsTablePatch(
      { tickets: { table: { hiddenColumns: ['old'] } } },
      { hiddenColumns: ['new'] }
    )

    expect((result.tickets as { table: { hiddenColumns: string[] } }).table.hiddenColumns).toEqual([
      'new'
    ])
  })
})

describe('mergeWorkflowPatch', () => {
  it('merges workflow partial without dropping other sections', () => {
    const result = mergeWorkflowPatch(
      { tickets: { table: { columnOrder: ['a'] } } },
      { ticketsOutputSplit: { contextePercent: 35 } }
    )

    expect(result).toEqual({
      tickets: { table: { columnOrder: ['a'] } },
      workflow: { ticketsOutputSplit: { contextePercent: 35 } }
    })
  })

  it('merges aboutOutputSplit without dropping ticketsOutputSplit', () => {
    const result = mergeWorkflowPatch(
      {
        workflow: {
          ticketsOutputSplit: { contextePercent: 40 },
          aboutOutputSplit: { contextePercent: 28 }
        }
      },
      { aboutOutputSplit: { contextePercent: 55 } }
    )

    expect(result.workflow).toEqual({
      ticketsOutputSplit: { contextePercent: 40 },
      aboutOutputSplit: { contextePercent: 55 }
    })
  })
})

describe('mergeAutomationsPatch', () => {
  it('merges automations partial without dropping other sections', () => {
    const result = mergeAutomationsPatch(
      { tickets: { table: { columnOrder: ['a'] } } },
      { panelSplit: { listPercent: 40 } }
    )

    expect(result).toEqual({
      tickets: { table: { columnOrder: ['a'] } },
      automations: { panelSplit: { listPercent: 40 } }
    })
  })
})

describe('mergeUpdatesPatch', () => {
  it('merges updates partial without dropping other sections', () => {
    const result = mergeUpdatesPatch(
      { tickets: { table: { columnOrder: ['a'] } } },
      { panelSplit: { listPercent: 28 } }
    )

    expect(result).toEqual({
      tickets: { table: { columnOrder: ['a'] } },
      updates: { panelSplit: { listPercent: 28 } }
    })
  })
})

describe('parseAndPatchUpdates', () => {
  it('normalizes invalid split values', () => {
    const result = parseAndPatchUpdates(
      { updates: { panelSplit: { listPercent: 5 } } },
      { panelSplit: { listPercent: 28 } }
    )

    expect(result.updates).toEqual({
      panelSplit: { listPercent: 28 }
    })
  })
})

describe('mergeWindowPatch', () => {
  it('merges window partial without dropping other sections', () => {
    const result = mergeWindowPatch(
      { tickets: { table: { columnOrder: ['a'] } }, window: { width: 1200, height: 800 } },
      { width: 1280, x: 10, y: 20 }
    )

    expect(result).toEqual({
      tickets: { table: { columnOrder: ['a'] } },
      window: { width: 1280, height: 800, x: 10, y: 20 }
    })
  })
})

describe('parseAndPatchWindow', () => {
  it('normalizes invalid window values while applying patch', () => {
    const result = parseAndPatchWindow(
      { window: { width: 100, height: 200, x: 10, y: 20 } },
      { width: 1280 }
    )

    expect(result.window).toEqual({
      width: 1280,
      height: 400,
      x: 10,
      y: 20
    })
  })
})

describe('parseAndPatchAutomations', () => {
  it('normalizes invalid split values', () => {
    const result = parseAndPatchAutomations(
      { automations: { panelSplit: { listPercent: 5 } } },
      { panelSplit: { listPercent: 40 } }
    )

    expect(result.automations).toEqual({
      panelSplit: { listPercent: 40 }
    })
  })
})

describe('parseAndPatchWorkflow', () => {
  it('normalizes invalid split values', () => {
    const result = parseAndPatchWorkflow(
      { workflow: { ticketsOutputSplit: { contextePercent: 5 } } },
      { ticketsOutputSplit: { contextePercent: 50 } }
    )

    expect(result.workflow).toEqual({
      ticketsOutputSplit: { contextePercent: 50 }
    })
  })
})

describe('parseAndPatchTicketsTable', () => {
  it('preserves columnValues when patching table layout only', () => {
    const result = parseAndPatchTicketsTable(
      {
        tickets: {
          table: {
            columnValues: {
              avancement: {
                'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
              }
            },
            columnOrder: ['a']
          }
        }
      },
      { columnOrder: ['id_reclamation'] }
    )

    expect(result.tickets).toEqual({
      table: {
        columnValues: {
          avancement: {
            'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
          }
        },
        columnOrder: ['id_reclamation']
      }
    })
  })

  it('normalizes invalid nested values while applying patch', () => {
    const result = parseAndPatchTicketsTable(
      { tickets: { table: { columnWidths: { bad: 'x' } } } },
      { columnOrder: ['id_reclamation'] }
    )

    expect(result.tickets).toEqual({
      table: {
        columnOrder: ['id_reclamation']
      }
    })
  })

  it('replaces one column color map while preserving others', () => {
    const generated = {
      ouvert: { bgColor: '#AABBCC', textColor: '#112233' },
      clos: { bgColor: '#CCBBAA', textColor: '#332211' }
    }
    const result = parseAndPatchTicketsTable(
      {
        tickets: {
          table: {
            columnValues: {
              avancement: {
                'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
              }
            }
          }
        }
      },
      {
        columnValues: {
          avancement: {
            'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
          },
          statut: generated
        }
      }
    )

    expect(result.tickets?.table?.columnValues).toEqual({
      avancement: {
        'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
      },
      statut: generated
    })
  })

  it('clears columnFilters when patch sends an empty object', () => {
    const result = parseAndPatchTicketsTable(
      {
        tickets: {
          table: {
            columnFilters: { avancement: ['travaux commandés'] },
            columnOrder: ['avancement']
          }
        }
      },
      { columnFilters: {} }
    )

    expect(result.tickets).toEqual({
      table: {
        columnOrder: ['avancement']
      }
    })
  })
})
