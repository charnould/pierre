import { z } from 'zod/v4'

import { TRACE_MODES } from '../../shared/chat'
import { isBusinessModuleId, type BusinessModuleId } from '../../shared/modules'

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
  reasoning_effort: z.enum(['low', 'medium', 'high']),
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
    enabled: z.boolean(),
    custom_data: z.object({ format: z.function() }).or(z.object({}))
  })
  .strict()

export const ChatbotConfig = z.union([DefaultChatbotConfig, InternalChatbotConfig])

export const SkillConfig = z.object(AgentFields).strict()

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
export const Reply = z.object({
  // Globals
  conv_id: z.string(),
  config: ChatbotConfig,
  role: z.enum(['assistant', 'user', 'system']).default('user'),
  timestamp: z.iso.datetime({ offset: true }).nullish().default(null),
  content: z.string(),
  metadata: z
    .object({
      user: z.string().trim().toLowerCase().nullish().default(null),
      topics: z.string().trim().toLowerCase().nullish().default(null),
      evaluation: z
        .object({
          customer: z
            .object({
              score: z.coerce.number().nullish().default(null).catch(null),
              comment: z.string().nullish().default(null)
            })
            .prefault({}),
          organization: z
            .object({
              score: z.coerce.number().nullish().default(null).catch(null),
              comment: z.string().nullish().default(null)
            })
            .prefault({}),
          ai: z
            .object({
              score: z.coerce.number().nullish().default(null).catch(null),
              comment: z.string().nullish().default(null)
            })
            .prefault({})
        })
        .prefault({}),
      tokens: z
        .object({
          // cache : z.number().nullish().default(null),
          prompt: z.number().nullish().default(null),
          completion: z.number().nullish().default(null),
          total: z.number().nullish().default(null)
        })
        .prefault({})
    })
    .prefault({})
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
export const AIContext = z
  .object({
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
  .refine(async (c) => {
    if (isDefaultChatbotConfig(c.config) && 'format' in c.config.custom_data) {
      if (
        Array.isArray(c.custom_data.raw) &&
        c.custom_data.raw.length === 1 &&
        c.custom_data.raw[0] === ''
      ) {
        c.custom_data.transformed = ''
      } else {
        const format = c.config.custom_data.format as (data: string[]) => string
        c.custom_data.transformed = format(c.custom_data.raw)
      }
    }

    return true
  })

//
//
export type User = z.infer<typeof User>
export type Reply = z.infer<typeof Reply>
export type DefaultChatbotConfig = z.infer<typeof DefaultChatbotConfig>
export type InternalChatbotConfig = z.infer<typeof InternalChatbotConfig>
export type ChatbotConfig = z.infer<typeof ChatbotConfig>
export type SkillConfig = z.infer<typeof SkillConfig>
export type Config = ChatbotConfig
export type AIContext = z.infer<typeof AIContext>
