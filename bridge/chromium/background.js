/**
 * Listener for Chrome extension action button clicks.
 * Injects the bundled 'logic.js' script into the current tab if not already injected.
 *
 * - Checks if the 'pierre-extension' marker element exists to prevent duplicate injection.
 * - Uses chrome.scripting.executeScript to run the packaged JS file.
 * - Handles success and error cases.
 */
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return

  try {
    // First, check if already injected by running a lightweight check in the tab
    const [{ result: alreadyInjected }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => !!document.querySelector('pierre-extension')
    })

    if (alreadyInjected) {
      console.warn('PIERRE extension already injected.')
      return
    }

    
    // Inject packaged JS file from the extension bundle
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['App.js']
    })

    console.log('PIERRE extension successfully injected.')
  } catch (error) {
    console.error('Failed to inject PIERRE extension:', error)
  }
})
