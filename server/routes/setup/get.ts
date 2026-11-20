import type { AuthContext } from '../../utils/authenticate-user'
import { repaymentDocumentTags } from '../../utils/repayment-documents'
import {
  aboutReady,
  anyChatbotReady,
  automationsReady,
  name,
  readSetupBytes,
  repaymentGaps,
  repaymentMessages,
  repaymentReady,
  ticketsReady
} from '../../utils/setup-store'

const documentTags = () => ({
  diagnostic: tagsOf('repayment/diagnostic.docx'),
  plan: tagsOf('repayment/plan.docx'),
  protocole: tagsOf('repayment/protocole.docx')
})

const tagsOf = (id: string): string[] | null => {
  const bytes = readSetupBytes(id)
  return bytes ? repaymentDocumentTags(bytes) : null
}

export const getSetup = (c: AuthContext) => {
  const tickets = ticketsReady()
  const repayment = repaymentReady()
  return c.json({
    data: {
      name: name(),
      tickets,
      repayments: repayment
        ? { ...repayment, messages: repaymentMessages(), documentTags: documentTags() }
        : null,
      repaymentGaps: repayment ? [] : repaymentGaps(),
      docxSkillIds: tickets ? ['replies'] : [],
      about: aboutReady(),
      automations: automationsReady(),
      chatbot: anyChatbotReady()
    }
  })
}
