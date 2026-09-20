import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { createGetAiBootController } from '../../../../controllers/ai/get.boot'
import type { ChatbotConfig, User } from '../../../../utils/_schema'
import { authenticate } from '../../../../utils/authenticate-user'
import { listAccessibleChatbots } from '../../../../utils/chatbot-config'

const publicOn: ChatbotConfig = {
  id: 'default',
  display: 'Public',
  enabled: true,
  community_knowledge: true,
  reasoning_effort: 'medium',
  trace: 'none',
  attachments: true,
  greeting: ['Bonjour'],
  examples: [],
  disclaimer: null,
  custom_data: {}
}

const interne: ChatbotConfig = {
  id: 'interne',
  display: 'Interne',
  community_knowledge: false,
  reasoning_effort: 'low',
  trace: 'none',
  attachments: false
}

const load = async (id: string): Promise<ChatbotConfig> => {
  if (id === 'default') return publicOn
  if (id === 'interne') return interne
  throw new Error('missing')
}

describe('GET /ai/boot', () => {
  it('returns 401 for anonymous requests', async () => {
    const app = new Hono()
    app.get('/ai/boot', authenticate, createGetAiBootController({ loadConfig: load }))
    const response = await app.request('/ai/boot')
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' }
    })
  })

  it('lists default when enabled plus assigned chatbots', async () => {
    const app = new Hono<{ Variables: { user: User } }>()
    app.use('*', async (c, next) => {
      c.set('user', {
        email: 'boot-test@pierre-ia.org',
        isAdministrator: false,
        moduleIds: [],
        chatbotIds: ['interne']
      })
      await next()
    })
    app.get(
      '/ai/boot',
      createGetAiBootController({
        loadConfig: load,
        listAccessible: listAccessibleChatbots
      })
    )

    const response = await app.request('/ai/boot')
    expect(response.status).toBe(200)
    const boot = (await response.json()) as {
      configId: string
      dataParam: string
      displayableConfigs: { id: string }[]
    }
    expect(boot.dataParam).toBe('')
    expect(boot.configId).toBe('interne')
    expect(boot.displayableConfigs.map(({ id }) => id).sort()).toEqual(['default', 'interne'])
  })

  it('rejects authenticated users with no public chatbot and no assigned profile', async () => {
    const app = new Hono<{ Variables: { user: User } }>()
    app.use('*', async (c, next) => {
      c.set('user', {
        email: 'without-chatbot@pierre-ia.org',
        isAdministrator: false,
        moduleIds: [],
        chatbotIds: []
      })
      await next()
    })
    app.get(
      '/ai/boot',
      createGetAiBootController({
        loadConfig: async (id) => {
          if (id === 'default') return { ...publicOn, enabled: false }
          throw new Error('missing')
        }
      })
    )

    const response = await app.request('/ai/boot')
    expect(response.status).toBe(403)
    expect(await response.json()).toEqual({
      error: { code: 'forbidden', message: 'Chatbot configuration access denied' }
    })
  })
})
