import type { Context } from 'hono'

import {
  aboutReady,
  automationsReady,
  defaultChatbotReady,
  name,
  repaymentReady,
  repaymentTemplates,
  ticketsReady
} from '../../../utils/setup-store'

export const controller = (c: Context) => {
  const tickets = ticketsReady()
  const repayment = repaymentReady()
  const chatbot = defaultChatbotReady()
  return c.json({
    name: name(),
    tickets,
    repayments: repayment ? { ...repayment, templates: repaymentTemplates() } : null,
    docxSkillIds: tickets ? ['replies'] : [],
    about: aboutReady(),
    automations: automationsReady(),
    chatbot: chatbot != null
  })
}
