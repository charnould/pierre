export function isTypingInField(target: EventTarget | null): boolean {
  const field = target as HTMLTextAreaElement | HTMLInputElement | null
  if (!field || (field.tagName !== 'TEXTAREA' && field.tagName !== 'INPUT')) return false
  return !field.readOnly
}
