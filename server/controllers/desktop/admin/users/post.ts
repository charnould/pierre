import type { Context } from 'hono'

import { createUser } from '../../../../utils/handle-user'
import { CreateUserBody, invalidBody, validateChatbotIds } from './shared'

export const controller = async (c: Context) => {
  const body = await c.req.json().catch(() => null)
  const parsed = CreateUserBody.safeParse(body)
  if (!parsed.success) return c.json(invalidBody(parsed.error), 400)

  const input = parsed.data
  if (!(await validateChatbotIds(input.chatbotIds))) {
    return c.json(
      { error: { code: 'invalid_chatbot', message: 'Un profil de chatbot est inconnu.' } },
      400
    )
  }

  const user = {
    email: input.email,
    isAdministrator: input.isAdministrator,
    moduleIds: input.moduleIds,
    chatbotIds: input.chatbotIds,
    password: input.password
  }
  if (!(await createUser(user))) {
    return c.json(
      { error: { code: 'user_exists', message: 'Un utilisateur avec cet e-mail existe déjà.' } },
      409
    )
  }
  const { password: _password, ...createdUser } = user

  return c.json(
    {
      data: {
        user: createdUser
      }
    },
    201
  )
}
