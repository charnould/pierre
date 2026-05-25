export type CalloutKind = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

const CALLOUT_RULES: { kind: CalloutKind; pattern: RegExp }[] = [
  { kind: 'danger', pattern: /\b(urgent|priorit[eé]\s+haute|danger|alerte|s[eé]curit[eé])\b/i },
  { kind: 'warning', pattern: /\b(attention|vigilance|prudence|risque)\b/i },
  { kind: 'success', pattern: /\b(confirm[eé]|valid[eé]|r[eé]solu|ok)\b/i },
  { kind: 'info', pattern: /\b(rappel|note\b|info\b|syst[eé]matique)\b/i }
]

export function calloutKindFromLabel(label: string): CalloutKind {
  for (const rule of CALLOUT_RULES) {
    if (rule.pattern.test(label)) return rule.kind
  }
  return 'neutral'
}

export function calloutKindFromMarkdownText(text: string): CalloutKind {
  const bold = /^\*\*(.+?)\*\*/.exec(text.trim()) ?? /\*\*(.+?)\*\*/.exec(text)
  return calloutKindFromLabel(bold?.[1] ?? text)
}
