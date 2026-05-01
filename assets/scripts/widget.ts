/** Initial state */
let pierre_is_open = false
let configuration: string
let url: string
let _pierre_button: HTMLElement & {
  dataset: { configuration: string; url: string }
}

/**
 * Handles the DOMContentLoaded event to:
 * - Inject PIERRE CSS into the webpage.
 * - Set up necessary configuration values.
 * - Preload PIERRE iframe for instant opening.
 */
document.addEventListener('DOMContentLoaded', () => {
  const css = document.createElement('style')
  css.innerText = `#pierre-ia {margin: 0;z-index: 9997;cursor: pointer;font-family: system-ui, Segoe UI, Roboto, Ubuntu, Helvetica Neue, sans-serif;transition: transform .45s cubic-bezier(.215, .61, .355, 1);position: fixed;bottom: 24px;right: 24px;}#pierre-ia:hover {transform: scale(1.15);}#pierre-wrapper {z-index: 9998;justify-content: center;align-items: center;width: 100%;height: 100%;display: flex;position: fixed;inset: 0;background: rgba(0, 0, 0, 0.25);backdrop-filter: blur(0px);-webkit-backdrop-filter: blur(0px);will-change: backdrop-filter;}#pierre-iframe-container {position: relative;}#pierre-iframe {z-index: 9999;border-radius: 14px;width: 600px;border: none;height: 700px;background: white;box-shadow: 0 4px 12px rgba(0,0,0,0.08), 0 12px 28px rgba(0,0,0,0.12), 0 32px 64px rgba(0,0,0,0.18);will-change: transform, opacity;}#pierre-close {display: none;font-size: 24px;padding: 0;margin: 0;cursor: pointer;z-index: 10000;position: absolute;top: 24px;right: 24px;transition: opacity .2s ease;}.blur_in {animation: blur_in .35s forwards;}.blur_out {animation: blur_out .30s forwards;}.open_modal {animation: open_modal 300ms cubic-bezier(0.16, 1, 0.3, 1) forwards;transform-origin: center;}.close_modal {animation: close_modal 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards;transform-origin: center;pointer-events: none;;}@keyframes blur_in {from {backdrop-filter: blur(0px);-webkit-backdrop-filter: blur(0px);}to {backdrop-filter: blur(6px);-webkit-backdrop-filter: blur(6px);}}@keyframes blur_out {from {backdrop-filter: blur(6px);-webkit-backdrop-filter: blur(6px);}to {backdrop-filter: blur(0px);-webkit-backdrop-filter: blur(0px);}}@keyframes open_modal {0% {opacity: 0;transform: scale(0.50);}60% {opacity: 1;transform: scale(1.03);;}100% {opacity: 1;transform: scale(1);}}@keyframes close_modal {0% {opacity: 1;transform: scale(1);}40% {opacity: 1;transform: scale(1.03);}100% {opacity: 0;transform: scale(0.50);}}@media (max-width:600px) {#pierre-iframe {box-shadow: none;border-radius: 0;width: 100vw;height: 100vh }#pierre-close {display: block }}`
  document.head.appendChild(css)

  const pierre_button = document.getElementById('pierre-ia')
  configuration = pierre_button?.dataset.configuration ?? 'default'
  url = pierre_button?.dataset.url ?? 'https://assistant.pierre-ia.org'

  const preloaded_iframe = document.createElement('iframe')
  preloaded_iframe.src = `${url}/?config=${configuration}`
  preloaded_iframe.style.display = 'none'
  preloaded_iframe.id = 'pierre-iframe'
  document.body.appendChild(preloaded_iframe)
})

/**
 * Listens for click events and opens the modal when the 'pierre-ia' button is clicked.
 * - Creates a wrapper (`pierre-wrapper`) with the 'blur_in' class.
 * - Creates a modal container (`pierre-iframe-container`).
 * - Retrieves the 'pierre-iframe' element and ensures it is visible.
 * - Creates a close button (`cross`) with a '✕' symbol.
 * - Appends the close button and iframe inside the modal.
 * - Appends the modal inside the wrapper, and the wrapper to the body.
 * - Sets `pierre_is_open` to `true`.
 */
document.addEventListener('click', (event) => {
  const button = document.getElementById('pierre-ia')
  if (!button) return

  if ((event.target as HTMLInputElement)?.id === 'pierre-ia') {
    const wrapper = document.createElement('div')
    wrapper.id = 'pierre-wrapper'
    wrapper.className = 'blur_in'

    const modal = document.createElement('div')
    modal.id = 'pierre-iframe-container'

    const iframe = document.getElementById('pierre-iframe')
    if (!iframe) return
    iframe.style.display = 'unset'
    iframe.className = 'open_modal'

    const close = document.createElement('p')
    close.id = 'pierre-close'
    close.textContent = '✕'

    modal.append(close, iframe)
    wrapper.appendChild(modal)
    document.body.appendChild(wrapper)
    pierre_is_open = true
  }

  /**
   * Closes the PIERRE modal if the user clicks outside the modal
   * content (on the wrapper) or directly on the close button.
   */
  if (
    (event.target as HTMLElement)?.id === 'pierre-wrapper' ||
    (event.target as HTMLElement)?.id === 'pierre-close'
  ) {
    close_modal()
  }
})

/**
 * Closes the PIERRE modal when the Escape key is pressed.
 * Listens for 'keydown' events and checks if the modal is open.
 */
document.addEventListener('keydown', (event: KeyboardEvent) => {
  if (pierre_is_open && event.key === 'Escape') {
    close_modal()
  }
})

/**
 * Closes the modal by performing the following steps:
 * - Removes the 'pierre-close' element if it exists.
 * - Adds the 'blur_out' class to the 'pierre-wrapper' and removes any other class.
 * - Adds the 'close_modal' class to the 'pierre-iframe' and removes any other class.
 * - After a 350ms delay:
 *   - Hides the 'pierre-iframe'.
 *   - Removes all classes from 'pierre-iframe'.
 *   - Moves 'pierre-iframe' back to the body.
 *   - Removes 'pierre-wrapper' from the DOM.
 *   - Sets `pierre_is_open` to false.
 */
const close_modal = () => {
  document.getElementById('pierre-close')?.remove()

  const wrapper = document.getElementById('pierre-wrapper')
  const iframe = document.getElementById('pierre-iframe')

  if (!wrapper || !iframe) return

  wrapper.className = 'blur_out'
  iframe.className = 'close_modal'

  setTimeout(() => {
    iframe.style.display = 'none'
    iframe.className = ''
    document.body.appendChild(iframe)
    wrapper.remove()
    pierre_is_open = false
  }, 350)
}
