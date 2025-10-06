// @ts-ignore
import css from './dist/styles.css' with { type: 'text' }
import { useRef, useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import Draggable from 'react-draggable'
import { MenuView, ChatbotView, GenerateAVView, CourrierView } from './components/generate'
type View = 'menu' | 'generateAV' | 'courrier' | 'chatbot'

//
//
//
//
//
async function run() {
  try {
    const bookmarklet = document.createElement('pierre-extension')
    bookmarklet.style.zIndex = '9999'
    bookmarklet.style.position = 'absolute'
    bookmarklet.style.top = '30px'
    bookmarklet.style.left = '30px'

    // Attach Shadow DOM
    const shadow = bookmarklet.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = css
    shadow.appendChild(style)

    const reactRoot = document.createElement('div')
    shadow.appendChild(reactRoot)

    function TurkApp() {
      const [view, setView] = useState<View>('menu')
      const nodeRef = useRef<HTMLDivElement>(null)
      const [apiUrl, setApiUrl] = useState<string>('')

      useEffect(() => {
        async function fetchApiUrl() {
          const result = await chrome.storage.local.get('apiUrl')
          if (result.apiUrl) {
            setApiUrl(result.apiUrl)
          }
        }
        fetchApiUrl()
      }, [])

      const handleSubmit = () => {
        chrome.storage.local.set({ apiUrl })
      }

      // Function to close the popup
      // const handleClose = () => {
      //   const host = document.querySelector('pierre-extension') as HTMLElement
      //   if (!host) return
      //   host.style.animation = 'exit 1s ease-out forwards'
      //   const onAnimationEnd = () => {
      //     host.remove()
      //     host.removeEventListener('animationend', onAnimationEnd)
      //   }
      //   host.addEventListener('animationend', onAnimationEnd)
      // }

      return (
        <Draggable nodeRef={nodeRef}>
          <div ref={nodeRef}>
            <div
              style={{
                animation: 'entrance 1s ease-out forwards',
                backgroundImage:
                  'linear-gradient(133.84deg, #4E4E4E -16.04%, #333333 9.33%, #1A1A1A 32.02%, #1A1A1A 62.06%, #262626 87.42%, #4E4E4E 112.12%)'
              }}
              className="block w-[333px] rounded-xl font-sans text-white tabular-nums shadow-[0_0_60px_0_rgba(0,0,0,0.6)]"
            >
              <h3>API URL</h3>
              <input
                type="text"
                id="apiUrl"
                placeholder="https://example.com/api"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
              <button id="saveButton" onClick={handleSubmit}>
                Submit
              </button>

              {apiUrl && (
                <>
                  {view === 'menu' && <MenuView onNavigate={setView} />}
                  {view === 'generateAV' && <GenerateAVView onBack={() => setView('menu')} />}
                  {view === 'courrier' && <CourrierView onBack={() => setView('menu')} />}
                  {view === 'chatbot' && <ChatbotView onBack={() => setView('menu')} />}
                </>
              )}
            </div>
          </div>
        </Draggable>
      )
    }

    const root = ReactDOM.createRoot(reactRoot)
    root.render(<TurkApp />)
    document.body.appendChild(bookmarklet)
  } catch (e) {
    console.log('error:', e)
  }
}

run()
