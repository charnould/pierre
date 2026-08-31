function isPanelHidden(panel: Element): boolean {
  if (panel.classList.contains('hidden')) return true
  const el = panel as HTMLElement
  if (el.style.pointerEvents === 'none') return true
  return getComputedStyle(el).pointerEvents === 'none'
}

/** Whether `target` sits inside a tab-panel that is currently hidden. */
export function isFocusInHiddenPanel(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el?.closest) return false
  const panel = el.closest('[data-tab-panel]')
  if (!panel) return false
  return isPanelHidden(panel)
}

/** Blur inputs/textareas focused inside a hidden tab-panel (stale focus). */
export function releaseHiddenPanelFocus(): void {
  const el = document.activeElement
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
  if (el.readOnly) return
  const panel = el.closest('[data-tab-panel]')
  if (!panel || !isPanelHidden(panel)) return
  el.blur()
}
