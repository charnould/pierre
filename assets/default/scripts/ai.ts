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
      const textarea = document.querySelector('textarea')
      if (textarea) auto_resize_textarea(textarea)
      process_prompt(prompt)
    }

    if (target && target.dataset.role === 'example') {
      event.preventDefault()
      const prompt = target.textContent?.trim() || ''
      process_prompt(prompt)
    }
  })

  /**
   * Select the ONLY <textarea> element on the page.
   * Attach an event listener to adjust the height dynamically as the user types
   * Initialize the height based on the current content
   */
  const textarea = document.querySelector('textarea')
  if (textarea) {
    textarea.addEventListener('input', () => auto_resize_textarea(textarea))
    auto_resize_textarea(textarea)
  }

  //
  //
  // Add event listener to keydown events
  //
  enableEnterKey()
})

//
//
//
//
//
// Small utils
//
//
//
//
//

/**
 * Handles the "Enter" key press event.
 *
 * This function is triggered when the "Enter" key is pressed. It prevents the
 * default action of the event, captures the prompt, resizes the textarea if it
 * exists, and processes the captured prompt.
 *
 * @param event - The keyboard event triggered by pressing a key.
 */
const enterKeyHandler = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    const prompt = capture_prompt()
    const textarea = document.querySelector('textarea')
    if (textarea) auto_resize_textarea(textarea)
    process_prompt(prompt)
  }
}

/**
 * Disables the Enter key event listener on the input field with the ID
 * 'prompt__input'. This function removes the previously attached 'keydown'
 * event listener that triggers the enterKeyHandler function.
 */
function disableEnterKey() {
  const inputField = document.getElementById('prompt__input')
  if (inputField) {
    inputField.removeEventListener('keydown', enterKeyHandler)
  }
}

/**
 * Enables the Enter key event listener on the input field with the ID
 * 'prompt__input'. This function attaches a 'keydown' event listener that
 * triggers the enterKeyHandler function.
 */
function enableEnterKey() {
  const inputField = document.getElementById('prompt__input')
  if (inputField) {
    inputField.addEventListener('keydown', enterKeyHandler)
  }
}

//
// Handle AI prompt processing
function process_prompt(prompt: string) {
  if (prompt !== '') {
    update_ui(prompt)
    get_ai_answer(prompt)
  }
}

/**
 * Adds a `target="_blank"` attribute to all anchor (`<a>`) elements on the
 * page. This ensures that all links open in a new tab or window.
 */
function add_blank_target_to_links() {
  const links = document.querySelectorAll('a')
  for (const link of links) {
    ;(link as HTMLAnchorElement).target = '_blank'
  }
}

/**
 * Scrolls the window to the bottom of the page smoothly.
 *
 * This function uses `window.scrollTo` with the `behavior` set to 'smooth' to
 * scroll to the bottom of the document. The scrolling is delayed by a timeout
 * of 5 milliseconds to ensure it runs after the current call stack is cleared.
 */
function scroll_to_bottom() {
  setTimeout(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    })
  }, 5)
}

/**
 * Automatically resizes a textarea element based on its content.
 *
 * This function sets the height of the textarea to 'auto' to reset any previous height,
 * then adjusts the height to fit the content up to a maximum of 300 pixels.
 *
 * @param textarea - The HTMLTextAreaElement to be resized.
 */
function auto_resize_textarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 250)}px`
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

  // Use DocumentFragment to improve performance by reducing reflows
  const fragment = document.createDocumentFragment()
  fragment.appendChild(userDiv)
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
  for (const button of document.querySelectorAll<HTMLButtonElement>('button')) {
    button.disabled = true
  }

  disableEnterKey()

  try {
    //
    // Construct URL parameters
    const conv_id = (
      document.querySelector('meta[name="conv_id"]') as HTMLMetaElement
    ).getAttribute('content')
    const searchParams = new URLSearchParams(window.location.search)
    const config = searchParams.get('config') || ''
    const data = searchParams.get('data') || ''

    // Build the API request URL
    const url = `/ai?message=${encodeURIComponent(prompt)}&config=${encodeURIComponent(config)}&data=${encodeURIComponent(data)}&conv_id=${encodeURIComponent(conv_id)}`

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

      const decodedValue = decoder.decode(value)

      if (decodedValue.includes('pierre_error')) {
        fullText =
          "<p class='pierre_error'>Une erreur s'est produite chez le fournisseur de modèle de langage. <span id='regenerate_answer'>Cliquer pour regénérer une réponse</span>. Si le problème persiste, patienter quelques minutes.</p>"
      } else {
        fullText += `${decoder.decode(value)}`
      }

      update_ui_with_ai(fullText)
    }
  } catch (err) {
    console.error(err)
  } finally {
    //
    // Re-enable all buttons
    for (const button of document.querySelectorAll<HTMLButtonElement>('button')) {
      button.disabled = false
    }

    enableEnterKey()
  }
}
