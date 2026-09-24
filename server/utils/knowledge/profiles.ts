import { PROMPTS } from '../../../shared/prompts'
import {
  defaultChatbotReady,
  internalChatbot,
  listInternalChatbots,
  skillPrompt
} from '../setup-store'

export type KnowledgeProfile = {
  id: string
  label: string
  kind: 'chatbot' | 'skill'
  communityKnowledge: boolean
}

export const listKnowledgeProfiles = async (): Promise<KnowledgeProfile[]> => {
  const profiles: KnowledgeProfile[] = PROMPTS.flatMap((prompt) =>
    skillPrompt(prompt.id)
      ? [{ id: prompt.id, label: prompt.label, kind: 'skill' as const, communityKnowledge: true }]
      : []
  )
  const publicChatbot = defaultChatbotReady()
  if (publicChatbot) {
    profiles.push({
      id: 'default',
      label: String(publicChatbot.display),
      kind: 'chatbot',
      communityKnowledge: publicChatbot.community_knowledge === true
    })
  }
  for (const chatbot of listInternalChatbots()) {
    profiles.push({
      id: chatbot.id,
      label: chatbot.display,
      kind: 'chatbot',
      communityKnowledge: internalChatbot(chatbot.id)?.community_knowledge === true
    })
  }
  return profiles.sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}
