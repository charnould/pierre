import { describe, expect, it } from 'bun:test'

import { getTicketCell, getTicketCellText, getTicketId } from './ticket-row'

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

describe('getTicketId', () => {
  it('reads id_reclamation', () => {
    expect(getTicketId({ id_reclamation: ' AFF-1 ' })).toBe('AFF-1')
    expect(getTicketId({ id_reclamation: 42 })).toBe('42')
    expect(getTicketId({})).toBeNull()
  })
})
