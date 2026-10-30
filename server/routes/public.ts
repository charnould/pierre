import type { Context } from 'hono'
import { Hono } from 'hono'

import { isDefaultChatbotConfig } from '../utils/_schema'
import { ChatbotConfigError, loadChatbotConfig } from '../utils/chatbot-config'
import { chatPage } from '../views/chat'
import { emptyPage } from '../views/empty'

function dataQuery(c: Context): string {
  const value = c.req.query('data')
  if (value === undefined || value === 'undefined') return ''
  return value
}

const getHome = async (c: Context) => {
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

export const getEmbed = async (c: Context) => {
  const dest = c.req.header('sec-fetch-dest')
  if (dest !== 'iframe' && !(dest == null && Boolean(c.req.query('host')))) return c.redirect('/')

  try {
    const config = await loadChatbotConfig('default')
    if (!isDefaultChatbotConfig(config) || !config.enabled) {
      return c.html(emptyPage(), 404)
    }
    return c.html(chatPage({ active_config: config, dataParam: '', embed: true }))
  } catch (error) {
    if (!(error instanceof ChatbotConfigError)) console.error('Error loading embed chatbot:', error)
    return c.html(emptyPage(), 404)
  }
}

export const publicRoutes = new Hono()

publicRoutes.get('/', getHome)
publicRoutes.get('/embed', getEmbed)
