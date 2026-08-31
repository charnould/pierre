import { describe, expect, it } from 'bun:test'

import {
  NOTIF_POP,
  ORBIT_DURATION,
  orbitArcs,
  orbitIdleBlend,
  pastillePopScale,
  shouldPlayOrbit,
  shouldPlayPastillePop
} from './orbit'

describe('orbitArcs', () => {
  it('emits six rings once they have entered', () => {
    expect(orbitArcs(1.2)).toHaveLength(6)
  })

  it('has not started at t=0', () => {
    expect(orbitArcs(0)).toHaveLength(0)
  })

  it('has faded out by the end of the orbit', () => {
    expect(orbitArcs(ORBIT_DURATION)).toHaveLength(0)
  })
})

describe('orbitIdleBlend', () => {
  it('stays on the orbit face until the handoff, then reaches idle', () => {
    expect(orbitIdleBlend(1)).toBe(0)
    expect(orbitIdleBlend(2.6)).toBe(0)
    expect(orbitIdleBlend(2.95)).toBeGreaterThan(0)
    expect(orbitIdleBlend(2.95)).toBeLessThan(1)
    expect(orbitIdleBlend(3.31)).toBe(1)
    expect(orbitIdleBlend(ORBIT_DURATION)).toBe(1)
  })
})

describe('pastillePopScale', () => {
  it('rests at 1 and overshoots once', () => {
    expect(pastillePopScale(0)).toBe(1)
    expect(pastillePopScale(0.45)).toBe(1)
    expect(pastillePopScale(0.2)).toBeGreaterThan(1)
    expect(pastillePopScale(0.2)).toBeLessThanOrEqual(NOTIF_POP)
  })
})

describe('unread edges', () => {
  it('replays orbit when unread already present increases', () => {
    expect(shouldPlayOrbit(1, 2)).toBe(true)
    expect(shouldPlayPastillePop(1, 2)).toBe(true)
  })
})
