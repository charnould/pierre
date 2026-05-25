import { describe, expect, test } from 'bun:test'

import { mergeSnapshot, snapshotsEqual, type NavigationSnapshot } from './navigation-snapshot'

const ticketsA: NavigationSnapshot = {
  tab: 'tickets',
  tickets: {
    step: 'output',
    ticketNumber: '716274',
    tenantNumber: '',
    message: '',
    context: 'ctx',
    ticketFormat: 'ticketReplyEmail'
  }
}

const ticketsTable: NavigationSnapshot = {
  tab: 'tickets',
  tickets: {
    step: 'form',
    ticketNumber: '',
    tenantNumber: '',
    message: '',
    context: '',
    ticketFormat: 'ticketReplyEmail'
  }
}

const aboutOutput: NavigationSnapshot = {
  tab: 'about',
  about: {
    step: 'output',
    aboutSubject: 'locataire',
    entityId: 'LOC-1',
    yearFrom: '2015',
    yearTo: '2020',
    context: ''
  }
}

const aboutForm: NavigationSnapshot = {
  tab: 'about',
  about: {
    step: 'form',
    aboutSubject: 'lot',
    entityId: '',
    yearFrom: '2000',
    yearTo: '2029',
    context: ''
  }
}

describe('snapshotsEqual', () => {
  test('matches identical snapshots', () => {
    expect(snapshotsEqual(ticketsA, { ...ticketsA, tickets: { ...ticketsA.tickets! } })).toBe(true)
  })

  test('differs on tab', () => {
    expect(snapshotsEqual(ticketsA, { tab: 'home' })).toBe(false)
  })

  test('differs on tickets sub-state', () => {
    expect(
      snapshotsEqual(ticketsA, {
        ...ticketsA,
        tickets: { ...ticketsA.tickets!, ticketNumber: '1' }
      })
    ).toBe(false)
  })

  test('differs on tickets draftRevision', () => {
    expect(
      snapshotsEqual(ticketsA, {
        ...ticketsA,
        tickets: { ...ticketsA.tickets!, draftRevision: 'edited' }
      })
    ).toBe(false)
  })

  test('matches identical about snapshots', () => {
    expect(snapshotsEqual(aboutOutput, { ...aboutOutput, about: { ...aboutOutput.about! } })).toBe(
      true
    )
  })

  test('differs on about sub-state', () => {
    expect(
      snapshotsEqual(aboutOutput, {
        ...aboutOutput,
        about: { ...aboutOutput.about!, entityId: 'LOC-2' }
      })
    ).toBe(false)
  })
})

describe('mergeSnapshot', () => {
  test('keeps tickets state when updating step on same tab', () => {
    expect(
      mergeSnapshot(ticketsA, {
        tickets: { ...ticketsA.tickets!, step: 'form' }
      })
    ).toEqual({
      ...ticketsA,
      tickets: { ...ticketsA.tickets!, step: 'form' }
    })
  })

  test('drops tickets state when switching to another tab', () => {
    expect(mergeSnapshot(ticketsA, { tab: 'home' })).toEqual({ tab: 'home' })
  })

  test('uses explicit tickets state when switching to tickets tab', () => {
    expect(mergeSnapshot({ tab: 'home' }, ticketsTable)).toEqual(ticketsTable)
  })

  test('keeps about state when updating step on same tab', () => {
    expect(
      mergeSnapshot(aboutOutput, {
        about: { ...aboutOutput.about!, step: 'form' }
      })
    ).toEqual({
      ...aboutOutput,
      about: { ...aboutOutput.about!, step: 'form' }
    })
  })

  test('drops about state when switching to another tab', () => {
    expect(mergeSnapshot(aboutOutput, { tab: 'home' })).toEqual({ tab: 'home' })
  })

  test('uses explicit about state when switching to about tab', () => {
    expect(mergeSnapshot({ tab: 'home' }, aboutForm)).toEqual(aboutForm)
  })
})
