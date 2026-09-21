import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import { controller as getCustomization } from '../../../../../controllers/desktop/customization/get'
import { authenticate } from '../../../../../utils/authenticate-user'

const route = new Hono()
route.get('/desktop/customization', authenticate, getCustomization)

const open = new Hono()
open.get('/desktop/customization', getCustomization)

describe('GET /desktop/customization', () => {
  it('requires an authenticated desktop session', async () => {
    const response = await route.request('/desktop/customization')
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'unauthorized', message: 'Authentication required' }
    })
  })

  it('returns name, tickets, repayments, templates and docx skill ids', async () => {
    const response = await open.request('/desktop/customization')
    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      name: string
      tickets: { buckets: unknown }
      repayments: { buckets: unknown; templates: Record<string, string> }
      docxSkillIds: string[]
    }
    expect(typeof body.name).toBe('string')
    expect(body.name.length).toBeGreaterThan(0)
    expect(Array.isArray(body.tickets.buckets)).toBe(true)
    expect(Array.isArray(body.repayments.buckets)).toBe(true)
    expect(Object.keys(body.repayments.templates).length).toBeGreaterThan(0)
    expect(Array.isArray(body.docxSkillIds)).toBe(true)
  })
})
