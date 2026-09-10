import type { Context } from 'hono'

import { BUSINESS_MODULES } from '../../../../../shared/modules'
import { listChatbotSummaries } from '../../../../utils/chatbot-config'
import { getUsers } from '../../../../utils/handle-user'
import { toAdminUser } from './shared'

export const controller = async (c: Context) => {
  const [users, chatbots] = await Promise.all([getUsers(), listChatbotSummaries()])
  return c.json({
    data: {
      users: users.map(toAdminUser),
      modules: BUSINESS_MODULES,
      chatbots
    }
  })
}
