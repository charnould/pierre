export function Navigation(props: {
  settings: any
  setSettings: any
  detectedView: any
  setDetectedView: any
}) {
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
  const { settings, setSettings, detectedView, setDetectedView } = props

  console.log('????icic: ', detectedView)

  return (
    <div className="flex cursor-pointer items-center justify-between px-3 pt-3 pb-0">
      {/* if AIEEEEEE */}
      {settings.isSet && detectedView === 'aie' && (
        <>
          <div
            onClick={() => setDetectedView('settings')}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs text-black"
          >
            ⁞
          </div>

          <div
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs text-black"
          >
            ✕
          </div>
        </>
      )}

      {/* if extension:
      is NOT set up: do not show any back button
      is set up: show back button 
      */}
      {settings.isSet && detectedView === 'settings' && (
        <>
          <svg
            onClick={() => setDetectedView('aie')}
            xmlns="http://www.w3.org/2000/svg"
            className="size-6 stroke-yellow-400"
            viewBox="0 0 24 24"
          >
            <path d="m12 16l1.4-1.4l-1.6-1.6H16v-2h-4.2l1.6-1.6L12 8l-4 4zm0 6q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22" />
          </svg>

          <div
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs text-black"
          >
            ✕
          </div>
        </>
      )}

      {/* {settings.isSet && detectedView !== 'settings' && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-400 text-xs text-black">
          ←
        </div>
      )} */}
    </div>
  )
}
