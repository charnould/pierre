import { describe, expect, test } from 'bun:test'

import { matchShortcut, parseShortcut, shortcutFromEvent, shortcutLabels } from './shortcut'

describe('dictation shortcut', () => {
  test('parses the default chord and ignores a modifier alone', () => {
    expect(parseShortcut('Alt+Space')).toEqual({
      alt: true,
      ctrl: false,
      meta: false,
      shift: false,
      code: 'Space'
    })
    expect(parseShortcut('Alt')).toBeNull()
    expect(
      shortcutFromEvent({
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        code: 'Space'
      })
    ).toBe('Alt+Space')
    expect(shortcutLabels('Alt+Space')).toEqual(['⌥', 'Espace'])
  })

  test('matches only the full chord', () => {
    const chord = parseShortcut('Ctrl+Alt+KeyD')
    expect(chord).not.toBeNull()
    expect(
      matchShortcut(
        { altKey: true, ctrlKey: true, metaKey: false, shiftKey: false, code: 'KeyD' },
        chord!
      )
    ).toBe(true)
    expect(
      matchShortcut(
        { altKey: false, ctrlKey: true, metaKey: false, shiftKey: false, code: 'KeyD' },
        chord!
      )
    ).toBe(false)
  })
})
