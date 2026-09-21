import { describe, expect, it } from 'bun:test'

import { Hono } from 'hono'

import {
  repaymentTemplate,
  skillTemplate
} from '../../../../../controllers/desktop/customization/get.docx'
import { authenticate } from '../../../../../utils/authenticate-user'

const route = new Hono()
route.get(
  '/desktop/customization/repayments/templates/template.docx',
  authenticate,
  repaymentTemplate
)
route.get('/desktop/customization/skills/:id/template.docx', authenticate, skillTemplate)

const open = new Hono()
open.get('/desktop/customization/skills/:id/template.docx', skillTemplate)

describe('GET /desktop/customization/*.docx', () => {
  it('requires an authenticated desktop session for the repayment template', async () => {
    const response = await route.request(
      '/desktop/customization/repayments/templates/template.docx'
    )
    expect(response.status).toBe(401)
  })

  it('requires an authenticated desktop session for a skill template', async () => {
    const response = await route.request(
      '/desktop/customization/skills/ticket.answer-ticket/template.docx'
    )
    expect(response.status).toBe(401)
  })

  it('rejects a skill id that escapes the skills directory', async () => {
    const response = await open.request('/desktop/customization/skills/../tickets/template.docx')
    expect(response.status).toBe(404)
  })
})
