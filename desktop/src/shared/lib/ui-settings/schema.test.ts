import { describe, expect, it } from 'bun:test'

import { clearColumnValueStyles } from './column-value-palette'
import {
  AUTOMATIONS_SPLIT_DEFAULT_LIST,
  DEFAULT_MASCOT_SETTINGS,
  DEFAULT_WINDOW_BOUNDS,
  listDroppedUiSettingsKeys,
  LOGIN_WINDOW_BOUNDS,
  MASCOT_SIZE_RANGE,
  mergeUiSettings,
  parseUiSettings,
  resolveTicketColumnLabel,
  resolveUiSettingsFromRaw,
  TICKET_COLUMN_VALUES_DEFAULTS,
  UI_SETTINGS_DEFAULTS,
  UI_SETTINGS_EXAMPLE,
  UPDATES_SPLIT_DEFAULT_LIST,
  WINDOW_MIN_SIZE,
  WORKFLOW_SPLIT_DEFAULT_CONTEXTE
} from './schema'

describe('parseUiSettings', () => {
  it('returns empty object for invalid input', () => {
    expect(parseUiSettings(null)).toEqual({})
    expect(parseUiSettings('nope')).toEqual({})
  })

  it('drops unknown top-level keys', () => {
    expect(parseUiSettings({ sidebar: { collapsed: true }, tickets: {} })).toEqual({})
    expect(
      parseUiSettings({
        markdown: { panelSplit: { listPercent: 36 } },
        tickets: { table: { columnOrder: ['id_reclamation'] } }
      })
    ).toEqual({
      tickets: { table: { columnOrder: ['id_reclamation'] } }
    })
  })

  it('drops unknown nested keys and retired table fields', () => {
    expect(
      parseUiSettings({
        tickets: { table: { columnOrder: ['motif'], pageSize: 50, legacyKey: 'drop-me' } },
        workflow: { ticketsOutputSplit: { contextePercent: 30 }, extra: true }
      })
    ).toEqual({
      tickets: { table: { columnOrder: ['motif'] } },
      workflow: { ticketsOutputSplit: { contextePercent: 30 } }
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
        workflow: { ticketsOutputSplit: { extra: true } }
      })
    ).toEqual({})
    expect(
      parseUiSettings({
        workflow: {
          ticketsOutputSplit: { contextePercent: 30, extra: true }
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
    ).toEqual({})
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
    expect(parseUiSettings({ window: { width: 'wide', height: null } })).toEqual({})
  })

  it('clamps the mascot size to the slider range', () => {
    expect(parseUiSettings({ mascot: { size: 500 } })).toEqual({
      mascot: { size: MASCOT_SIZE_RANGE.max }
    })
    expect(parseUiSettings({ mascot: { size: 10 } })).toEqual({
      mascot: { size: MASCOT_SIZE_RANGE.min }
    })
  })

  it('drops an invalid mascot shape and keeps a free hex colour', () => {
    expect(parseUiSettings({ mascot: { shape: 'star', color: '#ff00ff' } })).toEqual({
      mascot: { color: '#ff00ff' }
    })
  })

  it('drops an invalid mascot colour', () => {
    expect(parseUiSettings({ mascot: { color: 'magenta' } })).toEqual({})
  })

  it('migrates a legacy mascot shape and keeps a free hex colour', () => {
    expect(parseUiSettings({ mascot: { shape: 'blob', color: '#5b8c5a' } })).toEqual({
      mascot: { shape: 'galet', color: '#5b8c5a' }
    })
  })

  it('keeps a known mascot shape, body colour, and badge colour', () => {
    expect(
      parseUiSettings({
        mascot: { shape: 'goutte', color: '#5b8c5a', badgeColor: '#2496e8' }
      })
    ).toEqual({
      mascot: { shape: 'goutte', color: '#5b8c5a', badgeColor: '#2496e8' }
    })
  })

  it('round-trips the typed example document', () => {
    const parsed = JSON.parse(UI_SETTINGS_EXAMPLE) as Record<string, unknown>
    expect(parseUiSettings(parsed)).toEqual(parsed)
  })
})

describe('listDroppedUiSettingsKeys', () => {
  it('reports unknown and invalid paths', () => {
    expect(
      listDroppedUiSettingsKeys({
        sidebar: { collapsed: true },
        tickets: { table: { columnOrder: ['motif'], pageSize: 50 } },
        workflow: { ticketsOutputSplit: { contextePercent: 30, extra: true } }
      })
    ).toEqual(['sidebar', 'tickets.table.pageSize', 'workflow.ticketsOutputSplit.extra'])
  })

  it('is empty for a valid document', () => {
    expect(listDroppedUiSettingsKeys(JSON.parse(UI_SETTINGS_EXAMPLE) as unknown)).toEqual([])
  })
})

describe('mergeUiSettings', () => {
  it('falls back to default window size when window section is missing', () => {
    expect(mergeUiSettings({})).toMatchObject({
      window: { ...DEFAULT_WINDOW_BOUNDS }
    })
  })

  it('falls back to default mascot settings when the section is missing', () => {
    expect(mergeUiSettings({})).toMatchObject({
      mascot: { ...DEFAULT_MASCOT_SETTINGS }
    })
  })

  it('preserves mascot enabled and position', () => {
    expect(
      mergeUiSettings({
        mascot: { enabled: false, x: 40, y: 80 }
      })
    ).toMatchObject({
      mascot: { enabled: false, x: 40, y: 80 }
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

  it('drops unknown keys while filling known defaults', () => {
    const merged = mergeUiSettings({ chat: { fontSize: 14 } })
    expect((merged as Record<string, unknown>).chat).toBeUndefined()
    expect(merged.tickets?.table?.columnLabels).toEqual(
      UI_SETTINGS_DEFAULTS.tickets!.table!.columnLabels
    )
  })
})

describe('ticket columnValues defaults', () => {
  it('mergeUiSettings applies the default badge colours on a fresh install', () => {
    expect(mergeUiSettings({}).tickets?.table?.columnValues).toEqual(TICKET_COLUMN_VALUES_DEFAULTS)
  })

  it('mergeUiSettings keeps the user colours instead of the defaults', () => {
    const merged = mergeUiSettings({
      tickets: {
        table: {
          columnValues: {
            statut: { ouvert: { bgColor: '#111111', textColor: '#222222' } }
          }
        }
      }
    })
    expect(merged.tickets?.table?.columnValues).toEqual({
      statut: { ouvert: { bgColor: '#111111', textColor: '#222222' } }
    })
  })

  it('resolveUiSettingsFromRaw applies the defaults, so they reach the renderer', () => {
    expect(resolveUiSettingsFromRaw({}).tickets?.table?.columnValues).toEqual(
      TICKET_COLUMN_VALUES_DEFAULTS
    )
  })

  it('keeps a cleared column cleared while the other columns stay styled', () => {
    // `clearColumnValueStyles` drops the column's key and leaves the rest in place.
    const cleared = clearColumnValueStyles(TICKET_COLUMN_VALUES_DEFAULTS, 'statut')
    const columnValues = mergeUiSettings({ tickets: { table: { columnValues: cleared } } }).tickets
      ?.table?.columnValues

    expect(columnValues?.statut).toBeUndefined()
    expect(columnValues?.avancement).toEqual(TICKET_COLUMN_VALUES_DEFAULTS.avancement)
  })

  it('laisse le dernier badge effacé effacé au lieu de rappeler les défauts', () => {
    const columnValues = mergeUiSettings({ tickets: { table: { columnValues: {} } } }).tickets
      ?.table?.columnValues

    expect(columnValues).toEqual({})
  })

  it('distingue une carte vide explicite d’une installation neuve', () => {
    expect(
      resolveUiSettingsFromRaw({ tickets: { table: { columnValues: {} } } }).tickets?.table
        ?.columnValues
    ).toEqual({})
    expect(
      resolveUiSettingsFromRaw({ tickets: { table: {} } }).tickets?.table?.columnValues
    ).toEqual(TICKET_COLUMN_VALUES_DEFAULTS)
  })

  it('conserve la carte vide à l’écriture, sinon elle se relit en installation neuve', () => {
    // `parseUiSettings` est le normaliseur du chemin d'écriture : s'il supprime la
    // clé, le choix de l'utilisateur n'atteint jamais le disque.
    const written = parseUiSettings({ tickets: { table: { columnValues: {} } } })
    const writtenTickets = written['tickets'] as Record<string, Record<string, unknown>>

    expect(writtenTickets['table']?.['columnValues']).toEqual({})
    expect(resolveUiSettingsFromRaw(written).tickets?.table?.columnValues).toEqual({})
  })

  it('efface les quatre colonnes une à une sans que les défauts ne reviennent', () => {
    let columnValues = TICKET_COLUMN_VALUES_DEFAULTS
    for (const column of ['statut', 'avancement', 'degre_urgence', 'type_affaire']) {
      columnValues = clearColumnValueStyles(columnValues, column)
      const persisted = parseUiSettings({ tickets: { table: { columnValues } } })
      columnValues = resolveUiSettingsFromRaw(persisted).tickets?.table?.columnValues ?? {}
    }

    expect(columnValues).toEqual({})
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

describe('LOGIN_WINDOW_BOUNDS', () => {
  it('is a compact shell above the window minimum and below the session default', () => {
    expect(LOGIN_WINDOW_BOUNDS.width).toBe(400)
    expect(LOGIN_WINDOW_BOUNDS.height).toBeGreaterThanOrEqual(WINDOW_MIN_SIZE.height)
    expect(LOGIN_WINDOW_BOUNDS.height).toBeLessThan(DEFAULT_WINDOW_BOUNDS.height)
    expect(LOGIN_WINDOW_BOUNDS.height).toBe(560)
  })
})
