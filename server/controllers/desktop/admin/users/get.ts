import type { Context } from 'hono'

import { BUSINESS_MODULES } from '../../../../../shared/modules'
import { listChatbotSummaries } from '../../../../utils/chatbot-config'
import { getAdminUsers, getUserProfiles } from '../../../../utils/handle-user'

export const controller = async (c: Context) => {
  const [users, profiles, chatbots] = await Promise.all([
    getAdminUsers(),
    getUserProfiles(),
    listChatbotSummaries()
  ])
  return c.json({
    data: {
      users,
      profiles,
      modules: BUSINESS_MODULES,
      chatbots
    }
  })
}
