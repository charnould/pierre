import type { Context } from 'hono'

import {
  createUserProfile,
  deleteUserProfile,
  saveUserProfile
} from '../../../../utils/handle-user'
import {
  invalidBody,
  PatchProfileBody,
  ProfileBody,
  profileError,
  validateChatbotIds
} from './shared'

export const post = async (c: Context) => {
  const body = await c.req.json().catch(() => null)
  const parsed = ProfileBody.safeParse(body)
  if (!parsed.success) return c.json(invalidBody(parsed.error), 400)
  if (!(await validateChatbotIds(parsed.data.chatbotIds))) {
    return c.json({ error: { code: 'invalid_chatbot', message: 'Un chatbot est inconnu.' } }, 400)
  }
  const created = await createUserProfile(parsed.data)
  if (!created.ok) {
    const { error, status } = profileError(created.code)
    return c.json({ error }, status)
  }
  return c.json({ data: { profile: created.profile } }, 201)
}

export const patch = async (c: Context) => {
  const id = c.req.param('id') ?? ''
  const body = await c.req.json().catch(() => null)
  const parsed = PatchProfileBody.safeParse(body)
  if (!parsed.success) return c.json(invalidBody(parsed.error), 400)
  if (parsed.data.chatbotIds && !(await validateChatbotIds(parsed.data.chatbotIds))) {
    return c.json({ error: { code: 'invalid_chatbot', message: 'Un chatbot est inconnu.' } }, 400)
  }
  const saved = await saveUserProfile(id, parsed.data)
  if (!saved.ok) {
    const { error, status } = profileError(saved.code)
    return c.json({ error }, status)
  }
  return c.json({ data: { profile: saved.profile } })
}

export const remove = async (c: Context) => {
  const id = c.req.param('id') ?? ''
  const deleted = await deleteUserProfile(id)
  if (!deleted.ok) {
    const { error, status } = profileError(deleted.code)
    return c.json({ error }, status)
  }
  return c.json({ data: { id } })
}
