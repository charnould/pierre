//
//
// Initial state
let pierre_is_open = false
let configuration: string
let context: string
let url: string

//
//
//
// After DOM is loaded, add/show PIERRE button
document.addEventListener('DOMContentLoaded', () => {
  const css = document.createElement('style')
  css.innerText =
    '#pierre-ia{margin:0;z-index:9997;cursor:pointer;font-family:system-ui,Segoe UI,Roboto,Ubuntu,Helvetica Neue,sans-serif;transition:transform .35s;position:fixed;will-change:transform}#pierre-ia:hover{transform:scale(1.15)}#pierre-wrapper{backdrop-filter:blur(10px);background-color:rgba(25,29,68,.1);z-index:9998;justify-content:center;align-items:center;width:100%;height:100%;display:flex;position:fixed;top:0;left:0;animation:.5s forwards blur;will-change:backdrop-filter}#pierre-modal{position:relative}#pierre-iframe{z-index:9999;opacity:0;border:none;border-radius:10px;width:600px;height:700px;animation:1s forwards fadeIn;box-shadow:0 0 0 1px rgba(15,33,50,.05),0 .1em 2.8em -.8em rgba(15,33,50,.1),0 .2em 3.2em -1.2em rgba(15,33,50,.2)}#pierre-close{font-size:24px;padding:0;margin:0;cursor:pointer;z-index:101;display:none;position:absolute;top:24px;right:24px}@media (max-width:600px){#pierre-iframe{box-shadow:none;border-radius:0;width:100vw;height:100vh}#pierre-close{display:block}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes blur{from{backdrop-filter:blur(0px)}to{backdrop-filter:blur(10px)}}'
  document.head.appendChild(css)
})

//
//
//
// Listen to clicks to open or close PIERRE modal
document.addEventListener('click', (event) => {
  //
  const pierre_button = document.getElementById('pierre-ia')

  if (pierre_button === null) return

  //
  //
  //
  // Listen to clicks on a specific DOM elements to open PIERRE modal
  if ((event.target as HTMLInputElement)?.id === 'pierre-ia') {
    //
    configuration = pierre_button.dataset.configuration ?? 'pierre-ia.org' // default value
    context = pierre_button.dataset.context ?? 'default' // default value
    url = pierre_button.dataset.url ?? 'https://assistant.pierre-ia.org' // default value

    const wrapper = document.createElement('div')
    const modal = document.createElement('div')
    const iframe = document.createElement('iframe')
    const close = document.createElement('p')

    wrapper.id = 'pierre-wrapper'
    modal.id = 'pierre-modal'
    iframe.id = 'pierre-iframe'
    iframe.src = `${url}/?config=${configuration}&context=${context}`
    close.id = 'pierre-close'
    close.textContent = '✕'

    wrapper.appendChild(modal)
    modal.appendChild(close)
    modal.appendChild(iframe)
    document.body.appendChild(wrapper)

    pierre_is_open = true
  }

  //
  //
  //
  // Listen to clicks on specific DOM elements to close PIERRE modal
  if (
    (event.target as HTMLInputElement)?.id === 'pierre-wrapper' ||
    (event.target as HTMLInputElement)?.id === 'pierre-close'
  ) {
    close_modal()
  }
})

//
//
//
// Listen to Escape click to close PIERRE modal
document.addEventListener('keydown', (event) => {
  if (pierre_is_open === true && event.key === 'Escape') close_modal()
})

//
//
//
// Close modal function
function close_modal() {
  const el = document.getElementById('pierre-wrapper')
  if (el !== null) el.remove()
  pierre_is_open = false
}
