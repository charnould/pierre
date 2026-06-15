import { randomUUIDv7 } from 'bun'

import type { Displayable_configs } from '../controllers/chat/get'
import type { Config } from './_schema'

export type ChatBootData = {
  convId: string
  configId: string
  dataParam: string
  disclaimer: string | null
  greeting: string[]
  examples: string[]
  displayableConfigs: { id: string; display: string; is_active: boolean }[]
  assetId: string
  reasoningDisplay: 'off' | 'partial' | 'full'
  reasoningPlaceholders: string[]
}

export function buildChatBootData(
  active_config: Config,
  displayable_configs: Displayable_configs,
  dataParam = ''
): ChatBootData {
  return {
    convId: randomUUIDv7(),
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
    assetId: active_config.id,
    reasoningDisplay: active_config.reasoning_display,
    reasoningPlaceholders: active_config.reasoning_placeholders
  }
}
