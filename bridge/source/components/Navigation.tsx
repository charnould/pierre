export function Navigation(props: { settings: any; setSettings: any; view: any; setView: any }) {
  /**
   * Gracefully closes the pierre-extension popup by:
   * - applying the exit animation
   * - waiting for the animation to finish
   * - removing the host element from the DOM
   *
   * Safe to call multiple times: the listener auto-cleans (once: true)
   * and the function exits early if the element does not exist.
   */
  const onClose = () => {
    const host = document.querySelector<HTMLElement>('pierre-extension')
    if (!host) return

    host.style.animation = 'exit 1s ease-out forwards'
    host.addEventListener('animationend', () => host.remove(), { once: true })
  }

  // Get props
  const { settings, view, setView } = props

  console.log('navigation: ', view)

  return (
    <div className="navigation">
      {/* if unsupported */}
      {(view === 'unsupported' || view === 'task') && (
        <>
          <div onClick={() => setView('settings')} className="navigation__icon">
            ⁞
          </div>

          <div onClick={onClose} className="navigation__icon">
            ✕
          </div>
        </>
      )}

      {/* if extension:
      is NOT set up: do not show any back button
      is set up: show back button 
      */}
      {settings.isSet && view === 'settings' && (
        <>
          <div onClick={() => setView(undefined)} className="navigation__icon">
            ←
          </div>

          <div onClick={onClose} className="navigation__icon">
            ✕
          </div>
        </>
      )}

      {!settings.isSet && (
        <>
          <div></div>

          <div onClick={onClose} className="navigation__icon">
            ✕
          </div>
        </>
      )}
    </div>
  )
}
