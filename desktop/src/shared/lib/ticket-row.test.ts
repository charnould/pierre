import { describe, expect, it } from 'bun:test'

import {
  getTicketCell,
  getTicketCellText,
  getTicketHierarchyLabel,
  getTicketId
} from './ticket-row'

describe('getTicketCell', () => {
  it('returns null for missing values', () => {
    expect(getTicketCell({}, 'motif')).toBeNull()
    expect(getTicketCell({ motif: null }, 'motif')).toBeNull()
  })

  it('returns scalars as-is', () => {
    expect(getTicketCell({ motif: 'fuite' }, 'motif')).toBe('fuite')
    expect(getTicketCell({ count: 3 }, 'count')).toBe(3)
  })
})

describe('getTicketCellText', () => {
  it('trims string values', () => {
    expect(getTicketCellText({ motif: ' fuite ' }, 'motif')).toBe('fuite')
  })
})

describe('getTicketHierarchyLabel', () => {
  it('shows the most specific segment', () => {
    expect(
      getTicketHierarchyLabel(
        { qualification_hierarchie: 'technique > plomberie > fuite_de_lavabo' },
        'qualification_hierarchie'
      )
    ).toBe('fuite_de_lavabo')
    expect(
      getTicketHierarchyLabel({ qualification_hierarchie: 'technique' }, 'qualification_hierarchie')
    ).toBe('technique')
    expect(
      getTicketHierarchyLabel(
        { qualification_hierarchie: 'technique > fuite_de_lavabo' },
        'qualification_hierarchie'
      )
    ).toBe('fuite_de_lavabo')
    expect(
      getTicketHierarchyLabel({ qualification_hierarchie: null }, 'qualification_hierarchie')
    ).toBe('')
    expect(getTicketHierarchyLabel({}, 'qualification_hierarchie')).toBe('')
  })
})

describe('getTicketId', () => {
  it('reads id_reclamation', () => {
    expect(getTicketId({ id_reclamation: ' AFF-1 ' })).toBe('AFF-1')
    expect(getTicketId({ id_reclamation: 42 })).toBe('42')
    expect(getTicketId({})).toBeNull()
  })
})
