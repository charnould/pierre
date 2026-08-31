import { describe, expect, it } from 'bun:test'

import { MASCOT_SHAPES } from './look'
import {
  BODY_R,
  mascotBodyPath,
  mascotRadii,
  mascotViewBox,
  MASCOT_BODY_VIEWBOX,
  MASCOT_VIEWBOX,
  MASCOT_VIEWBOX_MIN,
  MASCOT_VIEWBOX_SIZE,
  PROFILE_SAMPLES,
  radiusAtAngle,
  SHAPE_BY_ID,
  SHAPES
} from './profiles'

const UP = -Math.PI / 2
const DOWN = Math.PI / 2
const RIGHT = 0

describe('mascot profiles', () => {
  it('centers the viewBox so a mask can cover the whole body', () => {
    expect(MASCOT_VIEWBOX_MIN).toBe(-79)
    expect(MASCOT_VIEWBOX_SIZE).toBe(158)
    expect(MASCOT_VIEWBOX).toBe('-79 -79 158 158')
    expect(mascotViewBox()).toBe(MASCOT_VIEWBOX)
    expect(mascotViewBox('scene')).toBe(MASCOT_VIEWBOX)
    expect(mascotViewBox('body')).toBe(MASCOT_BODY_VIEWBOX)
    expect(MASCOT_BODY_VIEWBOX).toBe('-50 -50 100 100')
  })

  it('ships the eight bloub skins in catalogue order', () => {
    expect(SHAPES.map((s) => s.id)).toEqual([...MASCOT_SHAPES])
    expect(SHAPE_BY_ID.size).toBe(8)
    for (const shape of MASCOT_SHAPES) {
      expect(SHAPE_BY_ID.get(shape)?.radii).toBe(mascotRadii(shape))
      expect(mascotRadii(shape)).toHaveLength(PROFILE_SAMPLES)
    }
  })

  it('ships a closed path for every shape', () => {
    for (const shape of MASCOT_SHAPES) {
      const path = mascotBodyPath(shape)
      expect(path.startsWith('M')).toBe(true)
      expect(path.endsWith('Z')).toBe(true)
    }
  })

  it('keeps a circle at radius 1 in every direction', () => {
    const radii = mascotRadii('cercle')
    expect(radii.every((r) => r === 1)).toBe(true)
    expect(radiusAtAngle(radii, 0)).toBeCloseTo(1)
    expect(radiusAtAngle(radii, Math.PI / 2)).toBeCloseTo(1)
  })

  it('points the triangle apex up, matching skins.ts (-90deg)', () => {
    const radii = mascotRadii('triangle')
    expect(radiusAtAngle(radii, UP)).toBeCloseTo(1.12)
    expect(radiusAtAngle(radii, DOWN)).toBeCloseTo(0.73)
    expect(radiusAtAngle(radii, RIGHT)).toBeCloseTo(0.843, 3)
  })

  it('points the goutte tip up, matching skins.ts hull', () => {
    const radii = mascotRadii('goutte')
    expect(Math.max(...radii)).toBeCloseTo(1.04)
    expect(radiusAtAngle(radii, UP)).toBeCloseTo(1.04)
    expect(radiusAtAngle(radii, RIGHT)).toBeCloseTo(0.615, 3)
  })

  it('builds the nuage from the five-lobe union, not a circle', () => {
    const radii = mascotRadii('nuage')
    expect(Math.max(...radii)).toBeCloseTo(1.02)
    expect(radiusAtAngle(radii, UP)).toBeCloseTo(0.714, 3)
    expect(radiusAtAngle(radii, DOWN)).toBeCloseTo(0.897, 3)
    expect(Math.min(...radii)).toBeLessThan(0.7)
  })

  it('places a goutte pastille on the real contour, not a unit circle', () => {
    const angle = (-42 * Math.PI) / 180
    const fit = radiusAtAngle(mascotRadii('goutte'), angle)
    expect(fit).not.toBeCloseTo(1, 1)
    expect(fit * BODY_R).toBeGreaterThan(20)
    expect(fit * BODY_R).toBeLessThan(60)
  })
})
