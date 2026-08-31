import { describe, expect, it } from 'bun:test'

import {
  mergeSectionPatch,
  mergeTicketsTablePatch,
  parseAndPatchAutomations,
  parseAndPatchMascot,
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

describe('mergeSectionPatch: workflow', () => {
  it('merges workflow partial without dropping other sections', () => {
    const result = mergeSectionPatch({ tickets: { table: { columnOrder: ['a'] } } }, 'workflow', {
      ticketsOutputSplit: { contextePercent: 35 }
    })

    expect(result).toEqual({
      tickets: { table: { columnOrder: ['a'] } },
      workflow: { ticketsOutputSplit: { contextePercent: 35 } }
    })
  })

  it('merges aboutOutputSplit without dropping ticketsOutputSplit', () => {
    const result = mergeSectionPatch(
      {
        workflow: {
          ticketsOutputSplit: { contextePercent: 40 },
          aboutOutputSplit: { contextePercent: 28 }
        }
      },
      'workflow',
      { aboutOutputSplit: { contextePercent: 55 } }
    )

    expect(result.workflow).toEqual({
      ticketsOutputSplit: { contextePercent: 40 },
      aboutOutputSplit: { contextePercent: 55 }
    })
  })
})

describe('mergeSectionPatch: automations', () => {
  it('merges automations partial without dropping other sections', () => {
    const result = mergeSectionPatch(
      { tickets: { table: { columnOrder: ['a'] } } },
      'automations',
      {
        panelSplit: { listPercent: 40 }
      }
    )

    expect(result).toEqual({
      tickets: { table: { columnOrder: ['a'] } },
      automations: { panelSplit: { listPercent: 40 } }
    })
  })
})

describe('mergeSectionPatch: updates', () => {
  it('merges updates partial without dropping other sections', () => {
    const result = mergeSectionPatch({ tickets: { table: { columnOrder: ['a'] } } }, 'updates', {
      panelSplit: { listPercent: 28 }
    })

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

describe('mergeSectionPatch: window', () => {
  it('merges window partial without dropping other sections', () => {
    const result = mergeSectionPatch(
      { tickets: { table: { columnOrder: ['a'] } }, window: { width: 1200, height: 800 } },
      'window',
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

describe('parseAndPatchMascot', () => {
  it('merges mascot settings without dropping other sections', () => {
    const result = parseAndPatchMascot(
      { updates: { panelSplit: { listPercent: 28 } }, mascot: { enabled: true, x: 10 } },
      { enabled: false, y: 40 }
    )

    expect(result.mascot).toEqual({ enabled: false, x: 10, y: 40 })
    expect(result.updates).toEqual({ panelSplit: { listPercent: 28 } })
  })
})

describe('mergeSectionPatch: mascot', () => {
  it('merges partial mascot settings', () => {
    const result = mergeSectionPatch({ mascot: { enabled: true, x: 12 } }, 'mascot', { y: 34 })

    expect(result.mascot).toEqual({ enabled: true, x: 12, y: 34 })
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

/**
 * Characterization of the six section patch paths, written to pin the current
 * behaviour before it is deduplicated. Every expectation below was captured from
 * the code as it stood; none of it is aspirational. If one of these fails, the
 * patcher changed what it persists.
 */
type SectionCase = {
  /** Top-level key of the document this section owns. */
  owns: string
  /** Reads the patched section back out of a document. */
  read: (doc: Record<string, unknown>) => unknown
  /** Applies the characterized patch to an arbitrary raw document. */
  apply: (raw: unknown) => Record<string, unknown>
  /** Section value expected when the patch lands on an empty document. */
  fromEmpty: Record<string, unknown>
  /** Document that already carries this section, plus a user-defined extra key. */
  existing: Record<string, unknown>
  /** Section value expected when the patch lands on `existing`. */
  merged: Record<string, unknown>
}

const CUSTOM_COLUMN_VALUES = {
  my_col: { 'my value': { bgColor: '#ABCDEF', textColor: '#123456' } }
}

/**
 * Every known section populated. Round-trips through `parseUiSettings` unchanged,
 * so it doubles as the "other sections untouched" fixture.
 */
const FULL_DOCUMENT: Record<string, unknown> = {
  window: { width: 1400, height: 950, x: 5, y: 6 },
  mascot: { enabled: true, x: 33, y: 44 },
  tickets: { table: { columnOrder: ['id_reclamation'], columnValues: CUSTOM_COLUMN_VALUES } },
  workflow: {
    ticketsOutputSplit: { contextePercent: 30 },
    aboutOutputSplit: { contextePercent: 31 }
  },
  automations: { panelSplit: { listPercent: 32 } },
  updates: { panelSplit: { listPercent: 34 } }
}

/**
 * Every section is normalized field-by-field, so a user-defined key inside
 * it is dropped. Encoded in the `merged` values below.
 */
const SECTION_CASES: SectionCase[] = [
  {
    owns: 'tickets',
    read: (doc) => (doc.tickets as { table?: unknown } | undefined)?.table,
    apply: (raw) => parseAndPatchTicketsTable(raw, { hiddenColumns: ['b'] }),
    fromEmpty: { hiddenColumns: ['b'] },
    existing: {
      tickets: {
        table: { columnOrder: ['a'], columnValues: CUSTOM_COLUMN_VALUES, legacyKey: 'drop-me' }
      }
    },
    merged: {
      columnOrder: ['a'],
      columnValues: CUSTOM_COLUMN_VALUES,
      hiddenColumns: ['b']
    }
  },
  {
    owns: 'workflow',
    read: (doc) => doc.workflow,
    apply: (raw) => parseAndPatchWorkflow(raw, { aboutOutputSplit: { contextePercent: 55 } }),
    fromEmpty: { aboutOutputSplit: { contextePercent: 55 } },
    existing: {
      workflow: { ticketsOutputSplit: { contextePercent: 30 }, legacyKey: 'drop-me' }
    },
    merged: {
      ticketsOutputSplit: { contextePercent: 30 },
      aboutOutputSplit: { contextePercent: 55 }
    }
  },
  {
    owns: 'automations',
    read: (doc) => doc.automations,
    apply: (raw) => parseAndPatchAutomations(raw, { panelSplit: { listPercent: 40 } }),
    fromEmpty: { panelSplit: { listPercent: 40 } },
    existing: { automations: { panelSplit: { listPercent: 32 }, legacyKey: 'drop-me' } },
    merged: { panelSplit: { listPercent: 40 } }
  },
  {
    owns: 'updates',
    read: (doc) => doc.updates,
    apply: (raw) => parseAndPatchUpdates(raw, { panelSplit: { listPercent: 42 } }),
    fromEmpty: { panelSplit: { listPercent: 42 } },
    existing: { updates: { panelSplit: { listPercent: 34 }, legacyKey: 'drop-me' } },
    merged: { panelSplit: { listPercent: 42 } }
  },
  {
    owns: 'window',
    read: (doc) => doc.window,
    apply: (raw) => parseAndPatchWindow(raw, { x: 10, y: 20 }),
    fromEmpty: { x: 10, y: 20 },
    existing: { window: { width: 1400, height: 950, legacyKey: 'dropped' } },
    merged: { width: 1400, height: 950, x: 10, y: 20 }
  },
  {
    owns: 'mascot',
    read: (doc) => doc.mascot,
    apply: (raw) => parseAndPatchMascot(raw, { y: 44 }),
    fromEmpty: { y: 44 },
    existing: { mascot: { enabled: true, x: 33, legacyKey: 'dropped' } },
    merged: { enabled: true, x: 33, y: 44 }
  }
]

describe('ui-settings section patch characterization', () => {
  for (const testCase of SECTION_CASES) {
    describe(testCase.owns, () => {
      it('creates the section when patching an empty document', () => {
        expect(testCase.read(testCase.apply({}))).toEqual(testCase.fromEmpty)
      })

      it('merges into an existing section rather than replacing it', () => {
        expect(testCase.read(testCase.apply(testCase.existing))).toEqual(testCase.merged)
      })

      it('leaves every other section byte-identical', () => {
        const patched = testCase.apply(FULL_DOCUMENT)
        for (const key of Object.keys(FULL_DOCUMENT)) {
          if (key === testCase.owns) continue
          expect(patched[key]).toEqual(FULL_DOCUMENT[key])
        }
      })

      it('drops an unknown top-level key', () => {
        expect(
          testCase.apply({ ...FULL_DOCUMENT, sidebar: { collapsed: true } }).sidebar
        ).toBeUndefined()
      })

      for (const malformed of [null, undefined, [], 'a string', 42, { tickets: 5 }] as unknown[]) {
        it(`does not throw on a malformed document: ${JSON.stringify(malformed)}`, () => {
          const patched = testCase.apply(malformed)
          expect(typeof patched).toBe('object')
          expect(patched).not.toBeNull()
        })
      }
    })
  }

  it('keeps user-defined columnValues through a table patch that omits them', () => {
    const patched = parseAndPatchTicketsTable(
      { tickets: { table: { columnValues: CUSTOM_COLUMN_VALUES } } },
      { columnOrder: ['id_reclamation'] }
    )

    expect(patched.tickets).toEqual({
      table: { columnValues: CUSTOM_COLUMN_VALUES, columnOrder: ['id_reclamation'] }
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

    const tickets = result.tickets as { table?: { columnValues?: unknown } } | undefined
    expect(tickets?.table?.columnValues).toEqual({
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
