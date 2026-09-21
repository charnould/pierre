import type { ChatBoot } from '../../shared/chat'
import type { ChatbotConfig } from './_schema'
import { chatbotSiteFields } from './_schema'

export type { ChatBoot }

export function buildChatBoot(
  active_config: ChatbotConfig,
  displayable: Array<{ id: string; display: string }>,
  dataParam = '',
  embed = false
): ChatBoot {
  const site = chatbotSiteFields(active_config)
  return {
    convId: Bun.randomUUIDv7(),
    configId: active_config.id,
    dataParam,
    greetings: site.greetings,
    disclaimer: site.disclaimer,
    examples: site.examples,
    displayableConfigs: displayable.map((c) => ({
      id: c.id,
      display: c.display,
      is_active: c.id === active_config.id
    })),
    trace: active_config.trace,
    attachments: active_config.attachments,
    embed
  }
}
