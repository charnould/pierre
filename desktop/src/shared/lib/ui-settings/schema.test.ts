import { describe, expect, it } from 'bun:test'

import {
  DEFAULT_WINDOW_BOUNDS,
  mergeUiSettings,
  mergeUiSettingsRawDocuments,
  parseUiSettings,
  resolveTicketColumnLabel,
  resolveUiSettingsFromRaw,
  UI_SETTINGS_DEFAULTS,
  WINDOW_MIN_SIZE,
  WORKFLOW_SPLIT_DEFAULT_CONTEXTE,
  AUTOMATIONS_SPLIT_DEFAULT_LIST,
  UPDATES_SPLIT_DEFAULT_LIST
} from './schema'

describe('parseUiSettings', () => {
  it('returns empty object for invalid input', () => {
    expect(parseUiSettings(null)).toEqual({})
    expect(parseUiSettings('nope')).toEqual({})
  })

  it('preserves unknown top-level keys', () => {
    expect(parseUiSettings({ sidebar: { collapsed: true }, tickets: {} })).toEqual({
      sidebar: { collapsed: true },
      tickets: {}
    })
  })

  it('normalizes tickets.table.columnValues', () => {
    expect(
      parseUiSettings({
        tickets: {
          table: {
            columnValues: {
              degre_urgence: {
                urgent: { bgColor: '#FF0033', textColor: '#991B1B' },
                ignored: 1
              }
            }
          }
        }
      })
    ).toEqual({
      tickets: {
        table: {
          columnValues: {
            degre_urgence: {
              urgent: { bgColor: '#FF0033', textColor: '#991B1B' }
            }
          }
        }
      }
    })
  })

  it('normalizes workflow.ticketsOutputSplit', () => {
    expect(
      parseUiSettings({
        workflow: { ticketsOutputSplit: { analysePercent: 45, extra: true } }
      })
    ).toEqual({
      workflow: {}
    })
    expect(
      parseUiSettings({
        workflow: {
          ticketsOutputSplit: { contextePercent: 30, analysePercent: 35, extra: true }
        }
      })
    ).toEqual({
      workflow: { ticketsOutputSplit: { contextePercent: 30 } }
    })
  })

  it('normalizes workflow.aboutOutputSplit', () => {
    expect(
      parseUiSettings({
        workflow: { aboutOutputSplit: { contextePercent: 10 } }
      })
    ).toEqual({
      workflow: {}
    })
    expect(
      parseUiSettings({
        workflow: {
          aboutOutputSplit: { contextePercent: 35, extra: true }
        }
      })
    ).toEqual({
      workflow: { aboutOutputSplit: { contextePercent: 35 } }
    })
  })

  it('normalizes tickets.table.columnLabels', () => {
    expect(
      parseUiSettings({
        tickets: {
          table: {
            columnLabels: {
              id_reclamation: "N° d'affaire",
              ignored: 42
            }
          }
        }
      })
    ).toEqual({
      tickets: {
        table: {
          columnLabels: {
            id_reclamation: "N° d'affaire"
          }
        }
      }
    })
  })

  it('normalizes window bounds and clamps undersized dimensions', () => {
    expect(
      parseUiSettings({
        window: { width: 200, height: 300, x: 10.5, y: -5, extra: true }
      })
    ).toEqual({
      window: {
        width: WINDOW_MIN_SIZE.width,
        height: WINDOW_MIN_SIZE.height,
        x: 11,
        y: -5
      }
    })
  })

  it('drops invalid window values', () => {
    expect(parseUiSettings({ window: { width: 'wide', height: null } })).toEqual({
      window: {}
    })
  })
})

describe('mergeUiSettings', () => {
  it('falls back to default window size when window section is missing', () => {
    expect(mergeUiSettings({})).toMatchObject({
      window: { ...DEFAULT_WINDOW_BOUNDS }
    })
  })

  it('falls back to default panel splits when sections are missing', () => {
    expect(mergeUiSettings({})).toMatchObject({
      workflow: {
        ticketsOutputSplit: { contextePercent: WORKFLOW_SPLIT_DEFAULT_CONTEXTE },
        aboutOutputSplit: { contextePercent: WORKFLOW_SPLIT_DEFAULT_CONTEXTE }
      },
      automations: { panelSplit: { listPercent: AUTOMATIONS_SPLIT_DEFAULT_LIST } },
      updates: { panelSplit: { listPercent: UPDATES_SPLIT_DEFAULT_LIST } }
    })
  })

  it('merges tickets and about workflow splits independently', () => {
    expect(
      mergeUiSettings({
        workflow: {
          ticketsOutputSplit: { contextePercent: 40 },
          aboutOutputSplit: { contextePercent: 55 }
        }
      }).workflow
    ).toEqual({
      ticketsOutputSplit: { contextePercent: 40 },
      aboutOutputSplit: { contextePercent: 55 }
    })
  })

  it('merges defaults with user overrides', () => {
    expect(
      mergeUiSettings({
        tickets: {
          table: {
            columnLabels: {
              motif: 'Motif'
            }
          }
        }
      })
    ).toMatchObject({
      tickets: {
        table: {
          columnLabels: {
            motif: 'Motif'
          }
        }
      }
    })
  })

  it('mergeUiSettingsRawDocuments replaces the document when incoming is empty', () => {
    expect(
      mergeUiSettingsRawDocuments(
        {
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
        },
        {}
      )
    ).toEqual({})
  })

  it('mergeUiSettingsRawDocuments preserves omitted table keys such as columnFilters', () => {
    expect(
      mergeUiSettingsRawDocuments(
        {
          tickets: {
            table: {
              columnFilters: { avancement: ['travaux commandés'] },
              columnOrder: ['avancement']
            }
          }
        },
        { tickets: { table: { columnOrder: ['id_reclamation'] } } }
      )
    ).toEqual({
      tickets: {
        table: {
          columnFilters: { avancement: ['travaux commandés'] },
          columnOrder: ['id_reclamation']
        }
      },
      window: {},
      workflow: {},
      automations: {},
      updates: {}
    })
  })

  it('mergeUiSettingsRawDocuments merges window partials', () => {
    expect(
      mergeUiSettingsRawDocuments(
        { window: { width: 1200, height: 800, x: 10, y: 20 } },
        { window: { width: 1280 } }
      )
    ).toEqual({
      window: { width: 1280, height: 800, x: 10, y: 20 },
      tickets: { table: {} },
      workflow: {},
      automations: {},
      updates: {}
    })
  })

  it('mergeUiSettingsRawDocuments preserves table keys omitted in partial saves', () => {
    expect(
      mergeUiSettingsRawDocuments(
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
        { tickets: { table: { columnOrder: ['id_reclamation'] } } }
      )
    ).toEqual({
      tickets: {
        table: {
          columnValues: {
            avancement: {
              'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
            }
          },
          columnOrder: ['id_reclamation']
        }
      },
      window: {},
      workflow: {},
      automations: {},
      updates: {}
    })
  })

  it('resolveUiSettingsFromRaw keeps columnValues from raw when parse drops them', () => {
    const raw = {
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
    expect(resolveUiSettingsFromRaw(raw).tickets?.table?.columnValues).toEqual({
      avancement: {
        'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
      }
    })
  })

  it('keeps unknown keys while filling known defaults', () => {
    const merged = mergeUiSettings({ chat: { fontSize: 14 } })
    expect(merged.chat).toEqual({ fontSize: 14 })
    expect(merged.tickets?.table?.columnLabels).toEqual(
      UI_SETTINGS_DEFAULTS.tickets!.table!.columnLabels
    )
  })
})

describe('resolveTicketColumnLabel', () => {
  it('falls back to the SQL column name', () => {
    expect(resolveTicketColumnLabel('motif')).toBe('motif')
  })

  it('returns a custom label when configured', () => {
    expect(
      resolveTicketColumnLabel('motif', {
        tickets: {
          table: {
            columnLabels: {
              motif: 'Motif de réclamation'
            }
          }
        }
      })
    ).toBe('Motif de réclamation')
  })
})
