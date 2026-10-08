function needsSpace(before: string, text: string): boolean {
  if (!before || !text) return false
  if (/\s$/.test(before) || /^\s/.test(text)) return false
  return !/^[,.;:!?)]/.test(text)
}

function writeValue(field: HTMLTextAreaElement, value: string, caret: number) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(field, value)
  field.dispatchEvent(new Event('input', { bubbles: true }))
  field.setSelectionRange(caret, caret)
}

/** Inserts at the caret. `execCommand` keeps the browser undo stack when it can. */
export function insertIntoTextarea(field: HTMLTextAreaElement, text: string) {
  const spoken = text.trim()
  if (!spoken) return
  const start = field.selectionStart ?? field.value.length
  const end = field.selectionEnd ?? start
  const before = field.value.slice(0, start)
  const after = field.value.slice(end)
  const chunk = `${needsSpace(before, spoken) ? ' ' : ''}${spoken}`
  field.focus()
  const inserted = document.execCommand?.('insertText', false, chunk) === true
  if (inserted && field.value.includes(spoken)) return
  const next = before + chunk + after
  writeValue(field, next, before.length + chunk.length)
}
