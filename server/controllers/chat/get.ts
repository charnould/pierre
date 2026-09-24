import type { Context } from 'hono'

import { isDefaultChatbotConfig } from '../../utils/_schema'
import { ChatbotConfigError, loadChatbotConfig } from '../../utils/chatbot-config'
import { chatPage } from '../../views/chat'
import { emptyPage } from '../../views/empty'

function dataQuery(c: Context): string {
  const value = c.req.query('data')
  if (value === undefined || value === 'undefined') return ''
  return value
}

/**
 * GET / — public chatbot when default.enabled, otherwise the empty page.
 */
export const controller = async (c: Context) => {
  try {
    const config = await loadChatbotConfig('default')
    if (!isDefaultChatbotConfig(config) || !config.enabled) {
      return c.html(emptyPage(), 404)
    }
    return c.html(chatPage({ active_config: config, dataParam: dataQuery(c) }))
  } catch (error) {
    if (!(error instanceof ChatbotConfigError))
      console.error('Error loading public chatbot:', error)
    return c.html(emptyPage(), 404)
  }
}
