export const DEFAULT_DICTATION_SHORTCUT = 'Alt+Space'

const MODIFIERS = new Set(['Alt', 'Ctrl', 'Meta', 'Shift'])

export type ShortcutChord = {
  alt: boolean
  ctrl: boolean
  meta: boolean
  shift: boolean
  code: string
}

export function parseShortcut(value: string): ShortcutChord | null {
  const parts = value.split('+').filter(Boolean)
  const code = parts.at(-1)
  if (!code || MODIFIERS.has(code)) return null
  const modifiers = new Set(parts.slice(0, -1))
  if ([...modifiers].some((modifier) => !MODIFIERS.has(modifier))) return null
  return {
    alt: modifiers.has('Alt'),
    ctrl: modifiers.has('Ctrl'),
    meta: modifiers.has('Meta'),
    shift: modifiers.has('Shift'),
    code
  }
}

export function matchShortcut(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'code'>,
  chord: ShortcutChord
): boolean {
  return (
    event.altKey === chord.alt &&
    event.ctrlKey === chord.ctrl &&
    event.metaKey === chord.meta &&
    event.shiftKey === chord.shift &&
    event.code === chord.code
  )
}

const MODIFIER_CODES = new Set([
  'AltLeft',
  'AltRight',
  'ControlLeft',
  'ControlRight',
  'MetaLeft',
  'MetaRight',
  'ShiftLeft',
  'ShiftRight'
])

export function shortcutFromEvent(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'code'>
): string | null {
  if (MODIFIER_CODES.has(event.code)) return null
  const parts: string[] = []
  if (event.ctrlKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.metaKey) parts.push('Meta')
  if (event.shiftKey) parts.push('Shift')
  parts.push(event.code)
  return parts.join('+')
}

const LABELS: Record<string, string> = {
  Alt: '⌥',
  Ctrl: 'Ctrl',
  Meta: '⌘',
  Shift: '⇧',
  Space: 'Espace'
}

export function shortcutLabels(value: string): string[] {
  return value
    .split('+')
    .filter(Boolean)
    .map((part) => LABELS[part] ?? part.replace(/^Key/, ''))
}
