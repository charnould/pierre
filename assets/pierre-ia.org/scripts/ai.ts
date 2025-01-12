// Import libs to make a single full JS bundle
import DOMPurify from 'dompurify'
import { marked } from 'marked'

//
//
//
// Event listeners
//
//
//

document.addEventListener('DOMContentLoaded', () => {
  //
  //
  //
  // Add event listener to click events
  //
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    if (target && target.id === 'regenerate_answer') {
      event.preventDefault()
      const user_questions = document.querySelectorAll('div[data-role="user"]')
      const prompt = user_questions[user_questions.length - 1]?.textContent?.trim() || ''
      update_ui(prompt)
      get_ai_answer(prompt)
    }
    if (target && target.id === 'prompt__submit') {
      event.preventDefault()
      const prompt = capture_prompt()
      process_prompt(prompt)
    }
    if (target && target.tagName === 'BUTTON') {
      event.preventDefault()
      const prompt = target.textContent?.trim() || ''
      process_prompt(prompt)
    }
  })
})

//
//
//
// Add event listener to keydown events
//
const inputField = document.getElementById('prompt__input')
if (inputField) {
  inputField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      const prompt = capture_prompt()
      process_prompt(prompt)
    }
  })
}

//
//
//
// Small utils
//
//
//

//
// Handle AI prompt processing
function process_prompt(prompt: string) {
  if (prompt !== '') {
    update_ui(prompt)
    get_ai_answer(prompt)
  }
}

//
// Add < target = "_blank" > to all links
function clone_system_logo() {
  const systemLogo = document.querySelector('[data-role="system__logo"]')
  if (!systemLogo) return null
  const clonedLogo = systemLogo.cloneNode(true)
  return clonedLogo
}

//
// Add target="_blank" to all links except those with the ID 'footprint__link'
function add_blank_target_to_links() {
  const links = document.querySelectorAll('a:not(#footprint__link)')
  for (const link of links) {
    ;(link as HTMLAnchorElement).target = '_blank'
  }
}

//
// Auto-scroll to the bottom of <div id="conversation">
function scroll_to_bottom() {
  const container = document.querySelector('main')
  if (container) container.scrollTop = container.scrollHeight
}

//
// Get user query
function capture_prompt() {
  const el = document.getElementById('prompt__input') as HTMLInputElement
  if (el) {
    const { value: prompt } = el
    el.value = ''
    return prompt.trim()
  }
  return 'Bonjour !'
}

//
// Write in UI PIERRE answser
async function update_ui_with_ai(message: string) {
  // Remove the loading element if it exists
  const loadingElement = document.querySelector('[data-role="system__loading"]')
  loadingElement?.remove()

  // Select the parent element and ensure it exists
  const parentElement = document.querySelector('main > div:last-child')
  if (!parentElement) return

  parentElement.classList.add('prose')

  // Clean and format the message for safe rendering
  // Safely parse the cleanMessage as Markdown
  const cleanMessage = message.replace(/<br\/>/g, '\n\n').replace(/\n{3,}/g, '\n\n')
  const sanitizedMessage = DOMPurify.sanitize(cleanMessage)
  parentElement.innerHTML = await marked.parse(sanitizedMessage)

  add_blank_target_to_links()
  scroll_to_bottom()
}

//
// Update UI
function update_ui(message: string) {
  const main = document.querySelector('main')
  if (!main) return

  // Create user message div
  const userDiv = document.createElement('div')
  userDiv.setAttribute('data-role', 'user')
  userDiv.classList.add('user')
  userDiv.textContent = message

  // Create bot message container with 'thinking' state
  const botDiv = document.createElement('div')
  botDiv.setAttribute('data-role', 'system')

  const thinkingDiv = document.createElement('div')
  thinkingDiv.classList.add('thinking')
  botDiv.appendChild(thinkingDiv)

  // Clone system logo
  const systemLogo = clone_system_logo() as Node

  // Use DocumentFragment to improve performance by reducing reflows
  const fragment = document.createDocumentFragment()
  fragment.appendChild(userDiv)
  fragment.appendChild(systemLogo)
  fragment.appendChild(botDiv)

  // Append everything to the main element
  main.appendChild(fragment)

  scroll_to_bottom()
}

//
//
//
//
// Get ai answer from PIERRE
//
//
//
//

async function get_ai_answer(prompt: string) {
  //
  // Disable all buttons
  ;(document.getElementById('prompt__submit') as HTMLButtonElement).disabled = true
  for (const button of document.querySelectorAll<HTMLButtonElement>('button')) {
    button.disabled = true
  }

  try {
    //
    // Construct URL parameters
    const pathSegment = window.location.pathname.substring(3)
    const searchParams = new URLSearchParams(window.location.search)
    const config = searchParams.get('config') || ''
    const context = searchParams.get('context') || ''

    // Build the API request URL
    const url = `/ai/${pathSegment}?message=${encodeURIComponent(prompt)}&config=${encodeURIComponent(config)}&context=${encodeURIComponent(context)}`

    const response = await fetch(url, { method: 'GET' })
    if (!response.body) throw new Error('Response body is null')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    let fullText = ''

    // Stream processing
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Add disclaimer if exists
        const disclaimerInput = document.getElementById('disclaimer') as HTMLInputElement
        if (disclaimerInput) {
          const disclaimerParagraph = document.createElement('div')
          disclaimerParagraph.setAttribute('data-role', 'disclaimer')
          disclaimerParagraph.textContent = disclaimerInput.value

          const mainElement = document.querySelector('main')
          if (mainElement) mainElement.appendChild(disclaimerParagraph)
        }
        break
      }

      fullText += decoder.decode(value)
      update_ui_with_ai(fullText)
    }

    console.log(fullText)
  } catch (error) {
    console.error(error)
  } finally {
    //
    // Re-enable all buttons
    ;(document.getElementById('prompt__submit') as HTMLButtonElement).disabled = false
    for (const button of document.querySelectorAll<HTMLButtonElement>('button')) {
      button.disabled = false
    }
  }
}
