const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform)

/**
 * Strip under OS window controls (traffic lights / Win overlay).
 * Drag region only — no custom chrome chrome.
 */
export function TitleBar() {
  return (
    <div
      className="drag bg-background border-border relative z-20 flex h-[var(--titlebar-height)] w-full shrink-0 items-center border-b"
      data-pierre-titlebar=""
      aria-hidden
    >
      {isMac ? <div className="w-[90px] shrink-0" /> : null}
    </div>
  )
}
