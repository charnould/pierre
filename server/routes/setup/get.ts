import type { AuthContext } from '../../utils/authenticate-user'
import {
  aboutReady,
  automationsReady,
  defaultChatbotReady,
  name,
  repaymentReady,
  repaymentTemplates,
  ticketsReady
} from '../../utils/setup-store'

export const getSetup = (c: AuthContext) => {
  const tickets = ticketsReady()
  const repayment = repaymentReady()
  const chatbot = defaultChatbotReady()
  return c.json({
    data: {
      name: name(),
      tickets,
      repayments: repayment ? { ...repayment, templates: repaymentTemplates() } : null,
      docxSkillIds: tickets ? ['replies'] : [],
      about: aboutReady(),
      automations: automationsReady(),
      chatbot: chatbot != null
    }
  })
}
