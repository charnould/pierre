import { describe, expect, it } from 'bun:test'

import {
  canShowFacetValueList,
  filterFacetValues,
  shouldFetchFacetsWithQuery
} from '@/features/tickets/components/TicketColumnFilter'
import {
  facetFilterUnavailableMessage,
  formatFacetLabel
} from '@/shared/lib/ui-settings/tickets-table'

describe('TicketColumnFilter helpers', () => {
  it('filterFacetValues returns all values when search is empty', () => {
    expect(filterFacetValues(['fuite', 'chauffage'], '')).toEqual(['fuite', 'chauffage'])
  })

  it('filterFacetValues matches prefix case-insensitively on display labels', () => {
    expect(filterFacetValues(['fuite', 'chauffage', 'Fuite'], 'fu')).toEqual(['fuite', 'Fuite'])
  })

  it('filterFacetValues matches empty facet label via (vide)', () => {
    expect(filterFacetValues(['', 'ouvert'], '(vi')).toEqual([''])
  })

  it('shouldFetchFacetsWithQuery is true only for high-cardinality columns with search', () => {
    expect(shouldFetchFacetsWithQuery(false, 'fu')).toBe(true)
    expect(shouldFetchFacetsWithQuery(false, '')).toBe(false)
    expect(shouldFetchFacetsWithQuery(true, 'fu')).toBe(false)
    expect(shouldFetchFacetsWithQuery(null, 'fu')).toBe(false)
  })

  it('canShowFacetValueList hides results for high-cardinality columns until search', () => {
    expect(canShowFacetValueList(false, '', false)).toBe(false)
    expect(canShowFacetValueList(false, 'fu', false)).toBe(true)
    expect(canShowFacetValueList(false, 'fu', true)).toBe(false)
    expect(canShowFacetValueList(true, '', false)).toBe(true)
  })

  it('facetFilterUnavailableMessage prompts search for high-cardinality columns', () => {
    expect(facetFilterUnavailableMessage(120)).toContain('120')
    expect(facetFilterUnavailableMessage(120)).toContain('recherche')
  })

  it('formatFacetLabel keeps empty values readable for search', () => {
    expect(formatFacetLabel('')).toBe('(vide)')
  })
})
