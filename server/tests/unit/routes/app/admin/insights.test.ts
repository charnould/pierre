import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { rm } from 'node:fs/promises'

import { Hono } from 'hono'

import {
  getConversation,
  listConversations,
  putConversationReview
} from '../../../../../routes/admin/conversations'
import { getLlmUsage, getRun, listRuns } from '../../../../../routes/admin/llm-runs'
import { AIContext, type ChatbotConfig, type User } from '../../../../../utils/_schema'
import { authorizeAdministrator } from '../../../../../utils/authorize-role'
import { save_reply } from '../../../../../utils/handle-conversation'
import { recordLlmRun } from '../../../../../utils/llm-runs'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { setup } from '../../../../../utils/setup'

const paths = testDatastorePaths('admin_insights')
const admin: User = {
  email: 'admin@example.org',
  isAdministrator: true,
  moduleIds: [],
  chatbotIds: []
}
const user: User = { ...admin, email: 'user@example.org', isAdministrator: false }
const config: ChatbotConfig = {
  id: 'default',
  display: 'PIERRE',
  enabled: true,
  community_knowledge: true,
  trace: 'none',
  attachments: false
}

const app = new Hono<{ Variables: { user: User } }>()
app.use('*', async (c, next) => {
  c.set('user', c.req.header('x-test-user') === 'user' ? user : admin)
  await next()
})
app.use('*', authorizeAdministrator)
app.get('/admin/conversations', listConversations)
app.get('/admin/conversations/:convId', getConversation)
app.put('/admin/conversations/:convId/review', putConversationReview)
app.get('/admin/llm-usage', getLlmUsage)
app.get('/admin/llm-runs', listRuns)
app.get('/admin/llm-runs/:id', getRun)

const request = (path: string, init: RequestInit = {}, actor: 'admin' | 'user' = 'admin') =>
  app.request(path, { ...init, headers: { 'x-test-user': actor, ...init.headers } })

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  await setup()
  const context = await AIContext.parseAsync({
    conv_id: 'conv-1',
    config,
    role: 'user',
    content: 'Quel est le délai de préavis ?',
    user_email: 'ada@example.org',
    custom_data: { raw: [] }
  })
  await save_reply(context)
  recordLlmRun({
    operation: 'chat',
    status: 'success',
    startedAt: new Date().toISOString(),
    durationMs: 1200,
    convId: 'conv-1',
    configId: 'default',
    userEmail: 'ada@example.org',
    automationId: null,
    provider: 'anthropic',
    model: 'claude-test',
    responseModels: ['claude-test'],
    reasoningEffort: 'medium',
    before: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
      cost: 0,
      contextUsage: null
    },
    after: {
      input: 20,
      output: 10,
      cacheRead: 0,
      cacheWrite: 0,
      total: 30,
      cost: 0.1,
      contextUsage: { tokens: 30, contextWindow: 200_000, percent: 0.015 }
    },
    reasoning: 'raisonnement confidentiel',
    error: null,
    providerCost: 0.1,
    retryCount: 0,
    compactions: [],
    tools: [
      {
        name: 'search',
        args: { q: 'préavis' },
        result: { text: 'un mois' },
        durationMs: 40,
        status: 'ok'
      }
    ]
  })
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('administration insights', () => {
  it('refuses a non administrator', async () => {
    expect((await request('/admin/conversations', {}, 'user')).status).toBe(403)
    expect((await request('/admin/llm-usage', {}, 'user')).status).toBe(403)
  })

  it('lists a conversation without its full transcript', async () => {
    const response = await request('/admin/conversations?q=préavis')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      data: { total: number; conversations: Array<{ preview: string; messageCount: number }> }
    }
    expect(body.data.total).toBe(1)
    expect(body.data.conversations[0]).toMatchObject({
      preview: 'Quel est le délai de préavis ?',
      messageCount: 1,
      reviewStatus: null
    })
  })

  it('keeps review comments append-only and rejects a stale update', async () => {
    const first = await request('/admin/conversations/conv-1/review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedUpdatedAt: null,
        status: 'action_required',
        score: 2,
        categories: ['knowledge_gap'],
        comment: 'Le délai est incomplet.'
      })
    })
    expect(first.status).toBe(200)
    const reviewed = (await first.json()) as {
      data: { review: { updatedAt: string; comments: unknown[] } }
    }
    expect(reviewed.data.review.comments).toHaveLength(1)

    const stale = await request('/admin/conversations/conv-1/review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedUpdatedAt: null,
        status: 'resolved',
        score: 5,
        categories: [],
        comment: 'écrasé'
      })
    })
    expect(stale.status).toBe(409)

    const second = await request('/admin/conversations/conv-1/review', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedUpdatedAt: reviewed.data.review.updatedAt,
        status: 'resolved',
        score: 4,
        categories: ['knowledge_gap'],
        comment: 'La source a été ajoutée.'
      })
    })
    expect(second.status).toBe(200)
    const saved = (await second.json()) as {
      data: { review: { comments: Array<{ body: string }> } }
    }
    expect(saved.data.review.comments.map((comment) => comment.body)).toEqual([
      'Le délai est incomplet.',
      'La source a été ajoutée.'
    ])
  })

  it('returns journal rows without reasoning and loads it on demand', async () => {
    const listed = await request('/admin/llm-runs?period=year')
    const body = (await listed.json()) as {
      data: { runs: Array<{ id: string; model: string; toolCount: number; reasoning?: string }> }
    }
    expect(body.data.runs[0]).toMatchObject({ model: 'claude-test', toolCount: 1, tokensTotal: 30 })
    expect(JSON.stringify(body.data.runs[0])).not.toContain('raisonnement')

    const detail = await request(`/admin/llm-runs/${body.data.runs[0]!.id}`)
    const run = (await detail.json()) as {
      data: {
        details: {
          reasoning: string
          tools: unknown[]
          providerCost: number
          contextUsage: { contextWindow: number }
          responseModels: string[]
        }
      }
    }
    expect(run.data.details.reasoning).toBe('raisonnement confidentiel')
    expect(run.data.details.tools).toHaveLength(1)
    expect(run.data.details).toMatchObject({
      providerCost: 0.1,
      contextUsage: { contextWindow: 200_000 },
      responseModels: ['claude-test']
    })
    expect((await request('/admin/llm-usage?period=year')).status).toBe(200)
  })
})
