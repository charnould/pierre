import { z } from 'zod/v4'

import { TRACE_MODES } from '../../shared/chat'
import { type BusinessModuleId, isBusinessModuleId } from '../../shared/modules'

const BusinessModuleIdSchema = z.custom<BusinessModuleId>(isBusinessModuleId)

export const User = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  isAdministrator: z.boolean(),
  moduleIds: z.array(BusinessModuleIdSchema),
  chatbotIds: z.array(z.string().trim().min(1))
})

const AgentFields = {
  id: z.string(),
  display: z.string(),
  community_knowledge: z.boolean(),
  trace: z.enum(TRACE_MODES)
}

const chromeLines = z.array(z.string()).nullish()
const chromeDisclaimer = z.string().nullish()

const SharedChatbotFields = {
  ...AgentFields,
  attachments: z.boolean(),
  greetings: chromeLines,
  examples: chromeLines,
  disclaimer: chromeDisclaimer
}

export const InternalChatbotConfig = z.object(SharedChatbotFields).strict()

export const DefaultChatbotConfig = z
  .object({
    ...SharedChatbotFields,
    enabled: z.boolean()
  })
  .strict()

export const ChatbotConfig = z.union([DefaultChatbotConfig, InternalChatbotConfig])

export function isDefaultChatbotConfig(
  config: ChatbotConfig
): config is z.infer<typeof DefaultChatbotConfig> {
  return 'enabled' in config
}

function chromeList(value: string[] | null | undefined): string[] {
  return (value ?? []).map((line) => line.trim()).filter((line) => line.length > 0)
}

function chromeText(value: string | null | undefined): string | null {
  const text = value?.trim() ?? ''
  return text.length > 0 ? text : null
}

export function chatbotSiteFields(config: ChatbotConfig): {
  greetings: string[]
  examples: string[]
  disclaimer: string | null
} {
  return {
    greetings: chromeList(config.greetings),
    examples: chromeList(config.examples),
    disclaimer: chromeText(config.disclaimer)
  }
}

//
// Reflects datastore database schema
const Reply = z.object({
  conv_id: z.string(),
  config: ChatbotConfig,
  role: z.enum(['assistant', 'user', 'system']).default('user'),
  content: z.string(),
  user_email: z.string().trim().toLowerCase().nullish().default(null)
})

//
// Structured JSON LLM must output for each request
const Augmented_Query = z.object({
  lang: z.string(),
  contains_profanity: z.boolean(),
  bm25_keywords: z.array(z.string()),
  search_queries: z.array(z.string()),
  standalone_questions: z.array(z.string())
})

//
// AI Context
export const AIContext = z.object({
  ...Reply.extend({ query: Augmented_Query.nullable().default(null) }).shape,
  ...z.object({
    chunks: z
      .object({
        community: z
          .array(z.object({ chunk_text: z.string(), chunk_file: z.string() }))
          .default([]),
        proprietary: z
          .array(z.object({ chunk_text: z.string(), chunk_file: z.string() }))
          .default([])
      })
      .default({ community: [], proprietary: [] }),
    custom_data: z.object({ raw: z.array(z.string()), transformed: z.string().default('') }),
    conversation: z
      .array(z.object({ role: z.enum(['assistant', 'user', 'system']), content: z.string() }))
      .default([])
  }).shape
})

//
//
export type User = z.infer<typeof User>
export type DefaultChatbotConfig = z.infer<typeof DefaultChatbotConfig>
export type InternalChatbotConfig = z.infer<typeof InternalChatbotConfig>
export type ChatbotConfig = z.infer<typeof ChatbotConfig>
export type Config = ChatbotConfig
export type AIContext = z.infer<typeof AIContext>
