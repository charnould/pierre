// @ts-ignore
import css from './style.css' with { type: 'text' }
import { useRef, useState, useEffect, JSX } from 'react'
import ReactDOM from 'react-dom/client'
import Draggable from 'react-draggable'
import { Respond } from './components/Respond'
import { Update } from './components/Update'
import { UnsupportedPage } from './components/UnsupportedPage'
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
    shadow.innerHTML = `
      <link rel="preconnect" href="https://rsms.me/">
      <link rel="stylesheet" href="https://rsms.me/inter/inter.css">
      <style>${css}</style>
      <div></div>
      `

    // `div` will serve as React root
    const reactRoot = shadow.querySelector('div')!

    /**
     * Bridge component - Main container for the Pierre browser extension UI.
     *
     * Manages the application state and lifecycle, including:
     * - Loading and persisting user settings from Chrome storage
     * - Checking for extension updates from the remote repository
     * - Detecting demo elements on the page to determine the current view
     * - Rendering the appropriate view based on the application state
     *
     * @component
     * @returns {JSX.Element} A draggable container with the Bridge UI, displaying one of three views:
     *   - `settings`: Configuration view for API credentials
     *   - `unsupported`: Fallback view when no compatible elements are found
     *   - `task`: Main task response view when demo elements are detected
     *
     * @remarks
     * - Settings are loaded from Chrome's local storage on mount
     * - If no settings are found, the settings view is displayed
     * - The component automatically detects demo elements and switches to task mode
     * - Update availability is checked on component mount
     */
    function Bridge(): JSX.Element {
      const nodeRef = useRef<HTMLDivElement>(null)

      /** State management (single source of truth!) */
      const [view, setView] = useState<undefined | 'settings' | 'unsupported' | 'task'>(undefined)
      const [needUpdate, setneedUpdate] = useState<boolean>(false)
      const [settings, setSettings] = useState({
        apiUrl: '',
        apiToken: '',
        isSet: false,
        source: '',
        target: ''
      })

      // On first render:
      // 1) Restore settings from Chrome storage.
      // 2) Check if a newer extension version is available.
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

            if (!stored.isSet) setView('settings')
          })
          .catch(() => console.error('Failed to fetch settings from Chrome storage.'))

        /**
         * Check if a new version of the extension is available.
         *
         * Fetches the remote version file from GitHub and compares it to the
         * current VERSION. Updates the `needUpdate` state accordingly:
         * - `true` if remote version is greater (update available)
         * - `false` if remote version is equal or lower (up to date)
         * - `undefined` if fetch fails or response is invalid
         */
        fetch(
          'https://raw.githubusercontent.com/charnould/pierre/refs/heads/master/assets/core/bridge/version'
        )
          // If response is not OK (404, network issue, etc.), reject to trigger catch
          .then((res) => (res.ok ? res.text() : Promise.reject()))
          .then((text) => {
            const gh_version = JSON.parse(text)
            // Set state: true if update needed, false if up to date
            setneedUpdate(gh_version > VERSION)
          })
          .catch(() => setneedUpdate(false))
      }, [])

      // Run once on first render, then again only when `view` changes.
      // If `view` is already set, skip the init routine.
      //
      // Otherwise:
      // - Look for the demo source/target elements in the DOM.
      // - If both exist, preload their IDs into settings and switch to "task" view.
      // - If not found, fall back to the "unsupported" view.
      useEffect(() => {
        if (view !== undefined) return

        const source_id = 'pierre-bridge-demo-question'
        const target_id = 'pierre-bridge-demo-answer'
        const source = document.getElementById(source_id)
        const target = document.getElementById(target_id)

        if (source && target) {
          setSettings((prev) => ({ ...prev, source: source_id, target: target_id }))
          setView('task')
        } else {
          setView('unsupported')
        }
      }, [view])

      // Draggable wrapper for the whole UI panel.
      return (
        <Draggable nodeRef={nodeRef}>
          <div ref={nodeRef}>
            <div className="bridge">
              {/* Render the active view (settings / error / main task). */}
              <div className="view">
                {view === 'settings' ? (
                  <Settings
                    settings={settings}
                    setSettings={setSettings}
                    view={view}
                    setView={setView}
                  />
                ) : view === 'unsupported' ? (
                  <UnsupportedPage
                    settings={settings}
                    setSettings={setSettings}
                    view={view}
                    setView={setView}
                  />
                ) : view === 'task' ? (
                  <Respond
                    settings={settings}
                    setSettings={setSettings}
                    view={view}
                    setView={setView}
                  />
                ) : null}
              </div>

              {/* Update banner shown only if a new version is available. */}
              <Update needUpdate={needUpdate} />
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
