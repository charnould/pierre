// @ts-ignore
import css from './dist.css' with { type: 'text' }
import { useRef, useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import Draggable from 'react-draggable'
import { Respond } from './components/Respond'
import { Update } from './components/Update'
import { CantDoAnything } from './components/Error'
import { Settings } from './components/Settings'
const chrome: any = (window as any).chrome
declare const VERSION: string

async function run() {
  try {
    // Create custom element and position it
    const bookmarklet = document.createElement('pierre-extension')
    Object.assign(bookmarklet.style, {
      position: 'absolute',
      zIndex: '9999',
      left: '50px',
      top: '50px'
    })

    // Attach Shadow DOM and add styles
    const shadow = bookmarklet.attachShadow({ mode: 'open' })
    shadow.innerHTML = `<style>${css}</style><div></div>`

    // `div` will serve as React root
    const reactRoot = shadow.querySelector('div')!

    function Bridge() {
      const nodeRef = useRef<HTMLDivElement>(null)

      /** State management (single source of truth!) */
      const [isUpdateNeeded, setIsUpdateNeeded] = useState<undefined | boolean>(undefined)
      const [settings, setSettings] = useState({ apiUrl: '', apiToken: '', isSet: false })
      const [detectedView, setDetectedView] = useState<'settings' | 'aie' | 'task'>('aie')

      /**
       * useEffect is a React hook that runs side effects in functional components.
       *
       * - The first argument is a function containing the effect (here: load settings and check version).
       * - The second argument is a dependency array. Because it's empty ([]), effects run only once when the component is first rendered.
       */
      useEffect(() => {
        /**
         * Load stored settings from Chrome's local storage and merge them
         * with the current component state.
         *
         * This ensures that any previously saved `apiUrl`, `apiToken`, or `isSet`
         * values are restored without overwriting existing state if the storage
         * doesn't have a value.
         */
        chrome.storage.local
          .get(['apiUrl', 'apiToken', 'isSet'])
          .then((stored: { apiUrl?: string; apiToken?: string; isSet?: boolean }) => {
            // Update state with stored values, keeping existing state as fallback
            setSettings((prev) => ({
              ...prev,
              apiUrl: stored.apiUrl ?? prev.apiUrl,
              apiToken: stored.apiToken ?? prev.apiToken,
              isSet: stored.isSet ?? prev.isSet
            }))

            // Log the updated settings for debugging purposes
            console.log('SETTINGS:', stored)
          })
          .catch(() => console.error('Failed to fetch settings from Chrome storage.'))

        /**
         * Check if a new version of the extension is available.
         *
         * Fetches the remote version file from GitHub and compares it to the
         * current VERSION. Updates the `isUpdateNeeded` state accordingly:
         * - `true` if remote version is greater (update available)
         * - `false` if remote version is equal or lower (up to date)
         * - `undefined` if fetch fails or response is invalid
         */
        fetch(
          'https://raw.githubusercontent.com/charnould/pierre/master/assets/core/bridge/version'
        )
          // If response is not OK (404, network issue, etc.), reject to trigger catch
          .then((res) => (res.ok ? res.text() : Promise.reject()))
          .then((text) => {
            const gh_version = JSON.parse(text)
            // Set state: true if update needed, false if up to date
            setIsUpdateNeeded(gh_version > VERSION)
          })
          .catch(() => {
            // Fetch failed or invalid response → cannot determine update status
            setIsUpdateNeeded(undefined)
          })
      }, [])

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

      const check = () => {
        const hasX = document.querySelector('#bridgepierre')
        if (hasX) {
          console.log('je pexu lancer la task') //setDetectedView('task')
          return true
        } else {
          console.log('je peux pas lancer la task') // setDetectedView('aie')
          return false
        }
      }

      //
      // Main component
      //
      return (
        <Draggable nodeRef={nodeRef}>
          <div ref={nodeRef}>
            <div
              className="w-[333px] rounded-2xl font-sans text-white tabular-nums shadow-[0_0_60px_rgba(0,0,0,0.6)]"
              style={{
                animation: 'entrance 1s ease-out forwards',
                backgroundImage:
                  'linear-gradient(133.84deg, #4E4E4E -16.04%, #333333 9.33%, #1A1A1A 32.02%, #1A1A1A 62.06%, #262626 87.42%, #4E4E4E 112.12%)'
              }}
            >
              <div className="flex cursor-pointer items-center justify-between px-3 pt-3 pb-0">
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
              </div>

              {detectedView !== 'settings' && settings.isSet && check() ? (
                <Respond
                  settings={settings}
                  setSettings={setSettings}
                  detectedView={detectedView}
                  setDetectedView={setDetectedView}
                />
              ) : (
                <CantDoAnything
                  settings={settings}
                  setSettings={setSettings}
                  detectedView={detectedView}
                  setDetectedView={setDetectedView}
                />
              )}

              {(!settings.isSet || (settings.isSet && detectedView === 'settings')) && (
                <Settings
                  settings={settings}
                  setSettings={setSettings}
                  detectedView={detectedView}
                  setDetectedView={setDetectedView}
                />
              )}

              <Update isUpdateNeeded={isUpdateNeeded} />
            </div>
          </div>
        </Draggable>
      )
    }

    const root = ReactDOM.createRoot(reactRoot)
    root.render(<Bridge />)
    document.body.appendChild(bookmarklet)
  } catch (e) {
    console.error(e)
  }
}

run()
