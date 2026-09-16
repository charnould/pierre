import type { Context } from 'hono'

import type { User } from '../../../../utils/_schema'
import { saveUserAsAdministrator } from '../../../../utils/handle-user'
import { invalidBody, PatchUserBody, profileError, validateChatbotIds } from './shared'

export const controller = async (c: Context) => {
  const email = (c.req.param('email') ?? '').trim().toLowerCase()
  const body = await c.req.json().catch(() => null)
  const parsed = PatchUserBody.safeParse(body)
  if (!parsed.success) return c.json(invalidBody(parsed.error), 400)
  const input = parsed.data

  if (!input.profileId && input.chatbotIds && !(await validateChatbotIds(input.chatbotIds))) {
    return c.json({ error: { code: 'invalid_chatbot', message: 'Un chatbot est inconnu.' } }, 400)
  }

  const patch = {
    ...(input.isAdministrator === undefined ? {} : { isAdministrator: input.isAdministrator }),
    ...(input.moduleIds === undefined ? {} : { moduleIds: input.moduleIds }),
    ...(input.chatbotIds === undefined ? {} : { chatbotIds: input.chatbotIds }),
    ...(input.profileId === undefined ? {} : { profileId: input.profileId }),
    ...(input.password ? { password: input.password } : {})
  }
  const actor = c.get('user') as User
  const saved = await saveUserAsAdministrator(actor.email, email, patch)
  if (!saved.ok) {
    if (saved.code === 'profile_not_found') {
      const { error, status } = profileError(saved.code)
      return c.json({ error }, status)
    }
    const messages = {
      user_not_found: 'Utilisateur introuvable.',
      cannot_demote_self: 'Vous ne pouvez pas retirer votre propre accès administrateur.',
      cannot_delete_self: 'Vous ne pouvez pas supprimer votre propre compte.',
      last_administrator: 'Le dernier administrateur ne peut pas être rétrogradé.'
    }
    return c.json(
      { error: { code: saved.code, message: messages[saved.code] } },
      saved.code === 'user_not_found' ? 404 : 409
    )
  }

  return c.json({
    data: {
      user: saved.user
    }
  })
}
