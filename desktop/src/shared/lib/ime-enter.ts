/** Enter that confirms an IME candidate instead of submitting the field. */
export function isComposingEnter(event: {
  key: string
  isComposing?: boolean
  keyCode: number
}): boolean {
  return event.key === 'Enter' && (event.isComposing === true || event.keyCode === 229)
}
