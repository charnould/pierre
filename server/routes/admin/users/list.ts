import { BUSINESS_MODULES } from '../../../../shared/modules'
import type { AuthContext } from '../../../utils/authenticate-user'
import { listChatbotSummaries } from '../../../utils/chatbot-config'
import { getAdminUsers, getUserProfiles } from '../../../utils/handle-user'

export const listUsers = async (c: AuthContext) => {
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
