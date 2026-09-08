import type { ChatBoot } from '../../shared/chat'
import type { Displayable_configs } from '../controllers/chat/get'
import type { Config } from './_schema'

export type { ChatBoot }

export function buildChatBoot(
  active_config: Config,
  displayable_configs: Displayable_configs,
  dataParam = ''
): ChatBoot {
  return {
    convId: Bun.randomUUIDv7(),
    configId: active_config.id,
    dataParam,
    disclaimer: active_config.disclaimer ?? null,
    greeting: active_config.greeting,
    examples: active_config.examples,
    displayableConfigs: displayable_configs.map((c) => ({
      id: c.id,
      display: c.display,
      is_active: c.id === active_config.id
    })),
    trace: active_config.trace,
    attachments: active_config.attachments
  }
}
