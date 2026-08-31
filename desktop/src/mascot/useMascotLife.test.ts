import { describe, expect, it } from 'bun:test'

import {
  breatheScale,
  easeInOutCubic,
  easeInQuad,
  easeOutCubic,
  IDLE_MODE,
  mouthOpenAt,
  pickWeighted,
  REST_GAZE,
  shouldPlayOrbit,
  shouldPlayPastillePop,
  waitMs
} from './useMascotLife'

describe('waitMs', () => {
  it('returns min at t=0 and max at t=1', () => {
    expect(waitMs(IDLE_MODE.wait, 0)).toBe(IDLE_MODE.wait.min)
    expect(waitMs(IDLE_MODE.wait, 1)).toBe(IDLE_MODE.wait.max)
  })

  it('squares the unit for idle bias', () => {
    expect(waitMs(IDLE_MODE.wait, 0.5)).toBe(
      IDLE_MODE.wait.min + (IDLE_MODE.wait.max - IDLE_MODE.wait.min) * 0.25
    )
  })
})

describe('pickWeighted', () => {
  it('picks blink first on a low roll in idle', () => {
    expect(pickWeighted(IDLE_MODE.clips, 0)).toBe('blink')
    expect(pickWeighted(IDLE_MODE.clips, 0.99)).toBe('glance')
  })

  it('includes a mouth clip', () => {
    expect(IDLE_MODE.clips.some((clip) => clip.id === 'mouth')).toBe(true)
  })
})

describe('shouldPlayOrbit', () => {
  it('fires on every unread increase', () => {
    expect(shouldPlayOrbit(0, 1)).toBe(true)
    expect(shouldPlayOrbit(1, 5)).toBe(true)
    expect(shouldPlayOrbit(3, 0)).toBe(false)
    expect(shouldPlayOrbit(0, 0)).toBe(false)
    expect(shouldPlayOrbit(4, 4)).toBe(false)
  })
})

describe('shouldPlayPastillePop', () => {
  it('fires when unread already present increases', () => {
    expect(shouldPlayPastillePop(1, 2)).toBe(true)
    expect(shouldPlayPastillePop(2, 5)).toBe(true)
    expect(shouldPlayPastillePop(0, 1)).toBe(false)
    expect(shouldPlayPastillePop(3, 3)).toBe(false)
    expect(shouldPlayPastillePop(3, 0)).toBe(false)
  })
})

describe('REST_GAZE', () => {
  it('rests down-left, with room for a wider face', () => {
    expect(REST_GAZE).toEqual({ x: -0.34, y: 0.28 })
  })
})

describe('easing', () => {
  it('starts at 0 and ends at 1', () => {
    expect(easeInQuad(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0)).toBe(0)
    expect(easeInOutCubic(1)).toBe(1)
    expect(easeInOutCubic(0.5)).toBe(0.5)
  })
})

describe('breatheScale', () => {
  it('rests at 1 and peaks at 1+amplitude halfway through the period', () => {
    expect(breatheScale(0, 2400, 0.045)).toBe(1)
    expect(breatheScale(1200, 2400, 0.045)).toBeCloseTo(1.045)
    expect(breatheScale(2400, 2400, 0.045)).toBeCloseTo(1)
  })
})

describe('mouthOpenAt', () => {
  it('keeps a small smile in idle and a more open mouth when unread', () => {
    expect(mouthOpenAt(false, 0)).toBeCloseTo(0.1)
    expect(mouthOpenAt(false, 1)).toBeCloseTo(0.26)
    expect(mouthOpenAt(true, 0)).toBeCloseTo(0.68)
    expect(mouthOpenAt(true, 1)).toBeCloseTo(0.94)
  })
})
