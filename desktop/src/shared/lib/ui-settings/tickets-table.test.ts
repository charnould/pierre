import { describe, expect, it } from 'bun:test'

import {
  areColumnFiltersEqual,
  clearAllColumnFilters,
  filtersToQueryParams,
  formatFacetLabel,
  facetFilterUnavailableMessage,
  hasActiveColumnFilters,
  isTicketTableSystemColumn,
  parseColumnFilters,
  parseColumnValues,
  parseColumnWidths,
  parseHexColor,
  parseHiddenColumns,
  parsePinnedColumns,
  resolveColumnOrder,
  resolveColumnWidth,
  resolvePinnedColumns,
  columnValueStyleToBadge,
  colorizeBadgeBorder,
  colorizeBadgeStyle,
  parseBadgeFontWeight,
  parseColumnValueBadgeDefaults,
  resolveColumnValueBadgeDefaults,
  resolveTicketValueDisplay,
  resolveUnpinnedColumnOrder,
  resolveVisibleColumnNames,
  sanitizeColumnFilters,
  stripTicketTableSystemColumns,
  stripTicketTableSystemColumnWidths,
  ticketTableSystemColumnSizing,
  TICKET_TABLE_ALERT_COLUMN_ID,
  TICKET_TABLE_ALERT_COLUMN_WIDTH
} from './tickets-table'

const DEFAULT_BADGE_STYLE = {
  fontWeight: 500
} as const

describe('tickets-table settings helpers', () => {
  it('resolveColumnOrder applies user order then appends missing columns', () => {
    expect(
      resolveColumnOrder(
        ['id_reclamation', 'motif', 'id_locataire', 'id_lot'],
        ['motif', 'id_reclamation']
      )
    ).toEqual(['motif', 'id_reclamation', 'id_locataire', 'id_lot'])
  })

  it('resolveVisibleColumnNames excludes hidden columns', () => {
    expect(
      resolveVisibleColumnNames(['id_reclamation', 'motif', 'id_lot'], {
        hiddenColumns: ['motif']
      })
    ).toEqual(['id_reclamation', 'id_lot'])
  })

  it('parseColumnFilters keeps only string arrays', () => {
    expect(parseColumnFilters({ motif: ['fuite'], bad: [1] })).toEqual({ motif: ['fuite'] })
  })

  it('parseHiddenColumns returns undefined for empty arrays', () => {
    expect(parseHiddenColumns([])).toBeUndefined()
    expect(parseHiddenColumns(['id_lot'])).toEqual(['id_lot'])
  })

  it('parsePinnedColumns returns undefined for empty arrays', () => {
    expect(parsePinnedColumns([])).toBeUndefined()
    expect(parsePinnedColumns(['motif'])).toEqual(['motif'])
  })

  it('resolvePinnedColumns uses defaults when user prefs are undefined', () => {
    expect(resolvePinnedColumns(['id_reclamation', 'motif', 'id_lot'])).toEqual([
      'id_reclamation',
      'id_lot'
    ])
  })

  it('resolvePinnedColumns returns empty when user unpins all columns', () => {
    expect(resolvePinnedColumns(['id_reclamation', 'motif'], [])).toEqual([])
  })

  it('parseColumnWidths keeps only valid integer widths', () => {
    expect(parseColumnWidths({ description: 320, motif: 80, tiny: 10, huge: 900 })).toEqual({
      description: 320,
      motif: 80
    })
  })

  it('parseColumnWidths returns undefined for empty objects', () => {
    expect(parseColumnWidths({})).toBeUndefined()
    expect(parseColumnWidths({ bad: 'x' })).toBeUndefined()
  })

  it('resolveColumnWidth returns saved width or fallback', () => {
    expect(resolveColumnWidth(320, 200)).toBe(320)
    expect(resolveColumnWidth(undefined, 200)).toBe(200)
  })

  it('resolveUnpinnedColumnOrder excludes pinned columns', () => {
    expect(resolveUnpinnedColumnOrder(['a', 'b', 'c', 'd'], ['a', 'c'])).toEqual(['b', 'd'])
  })

  it('parseHexColor accepts 3-, 6- and 8-digit hex', () => {
    expect(parseHexColor('#abc')).toBe('#abc')
    expect(parseHexColor('#FEE2E2')).toBe('#FEE2E2')
    expect(parseHexColor('#4468F04D')).toBe('#4468F04D')
    expect(parseHexColor('red')).toBeUndefined()
  })

  it('parseColumnValues keeps valid nested styles', () => {
    expect(
      parseColumnValues({
        degre_urgence: {
          urgent: { bgColor: '#FF0033', textColor: '#991B1B' },
          bad: { bgColor: 'not-hex', textColor: '#991B1B' },
          missingText: { bgColor: '#FF0033' },
          labelOnly: { label: 'Ignored' }
        }
      })
    ).toEqual({
      degre_urgence: {
        urgent: { bgColor: '#FF0033', textColor: '#991B1B' }
      }
    })
  })

  it('resolveTicketValueDisplay uses columnValues from ui-settings only', () => {
    const columnValues = {
      degre_urgence: {
        urgent: { bgColor: '#FF0033', textColor: '#991B1B' }
      },
      avancement: {
        'en cours': { bgColor: '#0057FF', textColor: '#1D4ED8' }
      }
    }
    expect(resolveTicketValueDisplay('degre_urgence', 'urgent', columnValues)).toEqual({
      text: 'Urgent',
      badgeStyle: {
        background: '#FF0033',
        color: '#991B1B',
        border: colorizeBadgeBorder('#FF0033', '#991B1B'),
        ...DEFAULT_BADGE_STYLE
      }
    })
    expect(resolveTicketValueDisplay('degre_urgence', 'Urgent', columnValues)).toEqual({
      text: 'Urgent',
      badgeStyle: {
        background: '#FF0033',
        color: '#991B1B',
        border: colorizeBadgeBorder('#FF0033', '#991B1B'),
        ...DEFAULT_BADGE_STYLE
      }
    })
    expect(resolveTicketValueDisplay('avancement', 'en cours', columnValues)).toEqual({
      text: 'En cours',
      badgeStyle: {
        background: '#0057FF',
        color: '#1D4ED8',
        border: colorizeBadgeBorder('#0057FF', '#1D4ED8'),
        ...DEFAULT_BADGE_STYLE
      }
    })
    expect(resolveTicketValueDisplay('avancement', 'En cours de traitement', columnValues)).toEqual(
      {
        text: 'En cours de traitement'
      }
    )
    expect(resolveTicketValueDisplay('degre_urgence', 'other', columnValues)).toEqual({
      text: 'other'
    })
    expect(resolveTicketValueDisplay('degre_urgence', 'urgent', undefined)).toEqual({
      text: 'urgent'
    })
    expect(resolveTicketValueDisplay('motif', 'fuite', undefined)).toEqual({ text: 'fuite' })
  })

  it('resolveTicketValueDisplay matches NFC/NFD accent variants', () => {
    const columnValues = {
      etat_de_la_reclamation: {
        annulé: { bgColor: '#FF0039', textColor: '#BE123C' }
      }
    }
    const nfd = 'annule\u0301'
    expect(resolveTicketValueDisplay('etat_de_la_reclamation', nfd, columnValues)).toEqual({
      text: 'Annulé',
      badgeStyle: {
        background: '#FF0039',
        color: '#BE123C',
        border: colorizeBadgeBorder('#FF0039', '#BE123C'),
        ...DEFAULT_BADGE_STYLE
      }
    })
  })

  it('resolveTicketValueDisplay applies table badge defaults for font weight', () => {
    const columnValues = {
      degre_urgence: {
        urgent: { bgColor: '#DD7568', textColor: '#5C2E26' }
      }
    }
    expect(
      resolveTicketValueDisplay('degre_urgence', 'urgent', columnValues, {
        fontWeight: 400
      })
    ).toEqual({
      text: 'Urgent',
      badgeStyle: {
        background: '#DD7568',
        color: '#5C2E26',
        border: colorizeBadgeBorder('#DD7568', '#5C2E26'),
        fontWeight: 400
      }
    })
  })

  it('parseColumnValueBadgeDefaults ignores legacy borderRadius', () => {
    expect(parseColumnValueBadgeDefaults({ borderRadius: '0', fontWeight: 500 })).toEqual({
      fontWeight: 500
    })
    expect(parseColumnValueBadgeDefaults({ borderRadius: '12px' })).toBeUndefined()
    expect(parseBadgeFontWeight('medium')).toBeUndefined()
  })

  it('columnValueStyleToBadge maps fill, ink and hue-matched filet', () => {
    const defaults = resolveColumnValueBadgeDefaults()
    const badge = columnValueStyleToBadge({ bgColor: '#FFD600', textColor: '#5C4A18' }, defaults)
    expect(badge).toEqual({
      background: '#FFD600',
      color: '#5C4A18',
      border: colorizeBadgeBorder('#FFD600', '#5C4A18'),
      fontWeight: 500
    })
    expect(colorizeBadgeStyle(badge)).toEqual({
      backgroundColor: '#FFD600',
      color: '#5C4A18',
      fontWeight: 500,
      borderColor: badge.border
    })
  })

  it('formatFacetLabel does not rename facet values', () => {
    expect(formatFacetLabel('urgent')).toBe('urgent')
    expect(formatFacetLabel('')).toBe('(vide)')
  })

  it('facetFilterUnavailableMessage mentions distinct count and search hint', () => {
    expect(facetFilterUnavailableMessage(120)).toBe(
      'Cette colonne compte 120 valeurs distinctes. Saisissez une recherche pour filtrer.'
    )
  })

  it('filtersToQueryParams drops empty filters', () => {
    expect(filtersToQueryParams({ motif: ['fuite'], empty: [] })).toEqual({ motif: ['fuite'] })
  })

  it('sanitizeColumnFilters keeps only filters with known schema columns', () => {
    expect(
      sanitizeColumnFilters({ motif: ['fuite'], old_column: ['legacy'], empty_values: [] }, [
        'id_reclamation',
        'motif'
      ])
    ).toEqual({ motif: ['fuite'] })
  })

  it('areColumnFiltersEqual compares key and value order', () => {
    expect(areColumnFiltersEqual({ motif: ['fuite'] }, { motif: ['fuite'] })).toBe(true)
    expect(areColumnFiltersEqual({ motif: ['fuite'] }, { motif: ['fuite', 'panne'] })).toBe(false)
    expect(areColumnFiltersEqual({ motif: ['fuite'] }, { statut: ['fuite'] })).toBe(false)
  })

  it('hasActiveColumnFilters detects non-empty filter values', () => {
    expect(hasActiveColumnFilters(undefined)).toBe(false)
    expect(hasActiveColumnFilters({})).toBe(false)
    expect(hasActiveColumnFilters({ motif: [] })).toBe(false)
    expect(hasActiveColumnFilters({ motif: ['fuite'] })).toBe(true)
  })

  it('clearAllColumnFilters returns empty object', () => {
    expect(clearAllColumnFilters()).toEqual({})
  })

  it('isTicketTableSystemColumn identifies the alert column', () => {
    expect(isTicketTableSystemColumn(TICKET_TABLE_ALERT_COLUMN_ID)).toBe(true)
    expect(isTicketTableSystemColumn('id_reclamation')).toBe(false)
  })

  it('stripTicketTableSystemColumns removes the alert column from order arrays', () => {
    expect(
      stripTicketTableSystemColumns([
        TICKET_TABLE_ALERT_COLUMN_ID,
        'id_reclamation',
        TICKET_TABLE_ALERT_COLUMN_ID
      ])
    ).toEqual(['id_reclamation'])
  })

  it('ticketTableSystemColumnSizing fixes width for the alert column', () => {
    expect(ticketTableSystemColumnSizing()).toEqual({
      [TICKET_TABLE_ALERT_COLUMN_ID]: TICKET_TABLE_ALERT_COLUMN_WIDTH
    })
  })

  it('stripTicketTableSystemColumnWidths removes the alert column from persisted widths', () => {
    expect(
      stripTicketTableSystemColumnWidths({
        __alertes__: 40,
        id_reclamation: 160
      })
    ).toEqual({ id_reclamation: 160 })
  })
})
