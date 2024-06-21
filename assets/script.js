//
//
//
// Initial state
//
//
//

const DEBUG = false // MUST be `false` in production
const conversation = []

//
//
//
// Start + Listener
//
//
//

document.getElementById('prompt').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    const prompt = capture_prompt()
    update_ui(prompt)
    get_ai_answer(prompt)
  }
})

document.getElementById('submit').addEventListener('click', (event) => {
  event.preventDefault()
  const prompt = capture_prompt()
  update_ui(prompt)
  get_ai_answer(prompt)
})

//
//
//
// Util functions
//
//
//

//
// Add < target = "_blank" > to all links
function add_blank_target_to_links() {
  const links = document.getElementsByTagName('a')
  for (let l = 0; l < links.length; l++) {
    links[l].target = '_blank'
  }
}

//
// Auto scroll to <div id="conversation"> bottom
function scroll_to_bottom() {
  const container = document.querySelector('#conversation')
  container.scrollTop = container.scrollHeight
}

//
// Get 'live' user prompt value
function capture_prompt() {
  const el = document.getElementById('prompt')
  const prompt = el.value
  el.value = ''
  return prompt
}

//
// Write in UI PIERRE answser
function update_ui_with_ai(message) {
  const el = document.querySelector('#conversation > div:last-child')
  el.removeAttribute('data-thinking')
  const clean_message = message.replace(/<br\/>/g, '\n\n').replace(/\n{3,}/g, '\n\n')
  el.innerHTML = marked.parse(clean_message)
  add_blank_target_to_links()
  scroll_to_bottom()
  return
}

//
// Get ai answer from PIERRE
function get_ai_answer(prompt) {
  const pathname = window.location.pathname
  const pathSegment = pathname.startsWith('/') ? pathname.substring(3) : pathname

  // Get the full URL
  const url2 = new URL(window.location.href)
  // Create a URLSearchParams object
  const params = new URLSearchParams(url2.search)
  // Get a specific parameter by name
  const config = params.get('config')

  const url = `/ai/${pathSegment}?message=${prompt}&config=${config}`

  const eventSource = new EventSource(url)
  let message = ''

  eventSource.onmessage = (event) => {
    if (event.data !== 'pierre_event_stream_closed') {
      message += event.data
      update_ui_with_ai(message)
    } else {
      eventSource.close()
    }
  }

  eventSource.onerror = (event) => {
    console.log(event)
  }
}

//
// Update UI
function update_ui(message) {
  const main = document.getElementById('conversation')

  const user_p = document.createElement('p')
  user_p.setAttribute('data-role', 'user')
  user_p.textContent = message
  main.appendChild(user_p)

  const bot_p = document.createElement('div')
  bot_p.setAttribute('data-role', 'system')

  const span = document.createElement('span')
  span.classList.add('loading')
  //span.innerHTML = '&nbsp; thinking...'

  bot_p.appendChild(span)
  main.appendChild(bot_p)

  scroll_to_bottom()
}
