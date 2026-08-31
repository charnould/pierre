import { describe, expect, it } from 'bun:test'

import {
  darkenHex,
  DEFAULT_MASCOT_BADGE_COLOR,
  DEFAULT_MASCOT_COLOR,
  DEFAULT_MASCOT_SHAPE,
  lightenHex,
  MASCOT_SHAPES,
  mascotBodyPaint,
  mascotLooksEqual,
  parseMascotColor,
  parseMascotShape,
  randomMascotLook,
  shiftHue
} from './look'

describe('defaults', () => {
  it('ships galet, steel body, and coral badge', () => {
    expect(DEFAULT_MASCOT_SHAPE).toBe('galet')
    expect(DEFAULT_MASCOT_COLOR).toBe('#5a7eb5')
    expect(DEFAULT_MASCOT_BADGE_COLOR).toBe('#ff6a45')
  })
})
describe('parseMascotShape', () => {
  it('accepts the eight bloub shapes', () => {
    for (const shape of MASCOT_SHAPES) {
      expect(parseMascotShape(shape)).toBe(shape)
    }
  })

  it('migrates the previous four ids', () => {
    expect(parseMascotShape('circle')).toBe('cercle')
    expect(parseMascotShape('square')).toBe('squircle')
    expect(parseMascotShape('blob')).toBe('galet')
    expect(parseMascotShape('capsule')).toBe('capsule')
  })
})

describe('parseMascotColor', () => {
  it('accepts any 6-digit hex, including colours outside the old allowlist', () => {
    expect(parseMascotColor('#ff00ff')).toBe('#ff00ff')
    expect(parseMascotColor('#FF00FF')).toBe('#ff00ff')
    expect(parseMascotColor('#c4a574')).toBe('#c4a574')
  })

  it('rejects short, empty, and non-hex values', () => {
    expect(parseMascotColor('#fff')).toBeUndefined()
    expect(parseMascotColor('magenta')).toBeUndefined()
    expect(parseMascotColor('#gg0000')).toBeUndefined()
  })
})

describe('lightenHex / darkenHex', () => {
  it('mixes the picker colour toward white and black', () => {
    expect(lightenHex('#c4a574')).toBe('#e2d2ba')
    expect(darkenHex('#c4a574')).toBe('#584a34')
  })
})

describe('shiftHue', () => {
  it('returns a 6-digit hex distinct from the picker when hue moves', () => {
    const next = shiftHue('#c4a574', 40, 0.08, -0.05)
    expect(parseMascotColor(next)).toBe(next)
    expect(next).not.toBe('#c4a574')
  })
})

describe('mascotBodyPaint', () => {
  it('is deterministic for a given picker hex', () => {
    expect(mascotBodyPaint('#c4a574')).toEqual(mascotBodyPaint('#c4a574'))
  })

  it('keeps the picker colour as the volume mid stop', () => {
    expect(mascotBodyPaint('#c4a574').vol.mid).toBe('#c4a574')
  })

  it('varies with the picker colour', () => {
    expect(mascotBodyPaint('#c4a574')).not.toEqual(mascotBodyPaint('#2496e8'))
  })

  it('ships iridescent pools and a rim around the picker colour', () => {
    const paint = mascotBodyPaint('#c4a574')
    expect(paint.cool.color).not.toBe('#c4a574')
    expect(paint.warm.color).not.toBe('#c4a574')
    expect(paint.deep.color).not.toBe('#c4a574')
    expect(paint.caustic.color).not.toBe('#c4a574')
    expect(paint.vol.wash).not.toBe('#c4a574')
    expect(paint.vol.blush).not.toBe('#c4a574')
    expect(paint.sheen.color).not.toBe('#ffffff')
    expect(paint.limb.opacity).toBeGreaterThan(0)
    expect(paint.rim.opacity).toBeGreaterThan(0)
  })
})

describe('randomMascotLook', () => {
  it('returns a known shape and saturated body and badge colours', () => {
    const sequence = [0, 0.1, 0.4, 0.7, 0.9, 0.2, 0.55, 0.8]
    let i = 0
    const random = () => sequence[i++ % sequence.length]!
    const look = randomMascotLook(undefined, random)
    expect(MASCOT_SHAPES).toContain(look.shape)
    expect(parseMascotColor(look.color)).toBe(look.color)
    expect(parseMascotColor(look.badgeColor)).toBe(look.badgeColor)
    expect(look.color).not.toBe('#000000')
    expect(look.color).not.toBe('#ffffff')
    expect(look.badgeColor).not.toBe('#000000')
    expect(look.badgeColor).not.toBe('#ffffff')
  })

  it('avoids the current pair when another exists', () => {
    const avoid = {
      shape: DEFAULT_MASCOT_SHAPE,
      color: DEFAULT_MASCOT_COLOR,
      badgeColor: DEFAULT_MASCOT_BADGE_COLOR
    }
    const look = randomMascotLook(avoid, () => 0.9)
    expect(mascotLooksEqual(look, avoid)).toBe(false)
  })
})
