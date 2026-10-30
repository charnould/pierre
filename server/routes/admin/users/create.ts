import type { AuthContext } from '../../../utils/authenticate-user'
import { createUser as createUserRecord } from '../../../utils/handle-user'
import { CreateUserBody, invalidBody, profileError, validateChatbotIds } from './shared'

export const createUser = async (c: AuthContext) => {
  const body = await c.req.json().catch(() => null)
  const parsed = CreateUserBody.safeParse(body)
  if (!parsed.success) return c.json(invalidBody(parsed.error), 400)

  const input = parsed.data
  const profileId = input.profileId ?? null
  if (!profileId && !(await validateChatbotIds(input.chatbotIds))) {
    return c.json({ error: { code: 'invalid_chatbot', message: 'Un chatbot est inconnu.' } }, 400)
  }

  const created = await createUserRecord({
    email: input.email,
    isAdministrator: input.isAdministrator,
    moduleIds: input.moduleIds,
    chatbotIds: input.chatbotIds,
    profileId,
    password: input.password
  })
  if (!created.ok) {
    if (created.code === 'profile_not_found') {
      const { error, status } = profileError(created.code)
      return c.json({ error }, status)
    }
    return c.json(
      { error: { code: 'user_exists', message: 'Un utilisateur avec cet e-mail existe déjà.' } },
      409
    )
  }

  return c.json({ data: { user: created.user } }, 201)
}
