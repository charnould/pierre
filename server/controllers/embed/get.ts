import type { Context } from 'hono'

import { isDefaultChatbotConfig } from '../../utils/_schema'
import { loadChatbotConfig } from '../../utils/chatbot-config'
import { chatPage } from '../../views/chat'
import { emptyPage } from '../../views/empty'

function isEmbedIframe(c: Context): boolean {
  const dest = c.req.header('sec-fetch-dest')
  return dest === 'iframe' || (dest == null && Boolean(c.req.query('host')))
}

/**
 * GET /embed — same public chat plus widget chrome, only inside an iframe.
 * A top-level tab redirects to `/`.
 */
export const controller = async (c: Context) => {
  if (!isEmbedIframe(c)) return c.redirect('/')

  try {
    const config = await loadChatbotConfig('default')
    if (!isDefaultChatbotConfig(config) || !config.enabled) {
      return c.html(emptyPage(), 404)
    }
    return c.html(chatPage({ active_config: config, dataParam: '', embed: true }))
  } catch (error) {
    console.error('Error loading embed chatbot:', error)
    return c.html(emptyPage(), 404)
  }
}
