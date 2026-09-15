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
  protected: z.boolean(),
  community_knowledge: z.boolean(),
  reasoning_effort: z.enum(['low', 'medium', 'high']),
  trace: z.enum(TRACE_MODES)
}

export const ChatbotConfig = z
  .object({
    ...AgentFields,
    show: z.array(z.string()),
    custom_data: z.object({ format: z.function() }).or(z.object({})),
    api: z
      .array(
        z.object({
          key: z.enum(['WEBHOOK_KEY_1', 'WEBHOOK_KEY_2', 'WEBHOOK_KEY_3']),
          url: z.string(),
          format: z.function({
            input: [
              z.object({ custom_data: z.array(z.string()), content: z.string(), role: z.string() })
            ],
            output: z.any()
          })
        })
      )
      .default([]),
    disclaimer: z.string().nullable(),
    greeting: z.array(z.string()),
    examples: z.array(z.string()),
    attachments: z.boolean()
  })
  .strict()

export const SkillConfig = z.object(AgentFields).strict()

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
    // Format data to be the one wanted by API
    if ('format' in c.config.custom_data) {
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
export type ChatbotConfig = z.infer<typeof ChatbotConfig>
export type SkillConfig = z.infer<typeof SkillConfig>
export type Config = ChatbotConfig
export type AIContext = z.infer<typeof AIContext>
