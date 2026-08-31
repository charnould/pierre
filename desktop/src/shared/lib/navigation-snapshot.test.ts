import { describe, expect, test } from 'bun:test'

import { mergeSnapshot, snapshotsEqual, type NavigationSnapshot } from './navigation-snapshot'

const ticketsA: NavigationSnapshot = {
  tab: 'tickets',
  activityTarget: { view: 'tickets', id_reclamation: '716274' }
}

const ticketsB: NavigationSnapshot = {
  tab: 'tickets',
  activityTarget: { view: 'tickets', id_reclamation: '1' }
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
    expect(snapshotsEqual(ticketsA, { ...ticketsA })).toBe(true)
  })

  test('differs on tab', () => {
    expect(snapshotsEqual(ticketsA, { tab: 'home' })).toBe(false)
  })

  test('differs on tickets activity target', () => {
    expect(snapshotsEqual(ticketsA, ticketsB)).toBe(false)
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
  test('keeps tickets activity when updating on same tab', () => {
    expect(mergeSnapshot(ticketsA, { activityTarget: ticketsA.activityTarget })).toEqual(ticketsA)
  })

  test('drops tickets state when switching to another tab', () => {
    expect(mergeSnapshot(ticketsA, { tab: 'home' })).toEqual({ tab: 'home' })
  })

  test('uses explicit tickets state when switching to tickets tab', () => {
    expect(mergeSnapshot({ tab: 'home' }, ticketsA)).toEqual(ticketsA)
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
