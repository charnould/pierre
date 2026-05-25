export const WORKFLOW_REASONING_SCROLL_PIN_THRESHOLD_PX = 48

export function distanceFromScrollBottom(el: HTMLElement): number {
  return el.scrollHeight - el.scrollTop - el.clientHeight
}

export function isScrollPinned(
  el: HTMLElement,
  threshold = WORKFLOW_REASONING_SCROLL_PIN_THRESHOLD_PX
): boolean {
  return distanceFromScrollBottom(el) <= threshold
}

export function scrollToBottom(el: HTMLElement) {
  el.scrollTop = el.scrollHeight
}
