import type { LanguageModel, ProviderMetadata } from 'ai'
import { z } from 'zod/v4'

/**
 * Represents a User schema definition using Zod.
 *
 * This schema validates the structure of a user object with the following properties:
 *
 * - `email`: A string that is trimmed and converted to lowercase.
 * - `role`: An enumerated string that can be one of 'administrator', 'contributor', or 'collaborator'.
 * - `config`: A string that is trimmed.
 * - `password_hash`: A string representing the hashed password of the user.
 */
export const User = z.object({
  role: z.enum(['administrator', 'contributor', 'collaborator']).catch('collaborator'),
  config: z.string().trim().toLowerCase(),
  email: z.email().trim().toLowerCase(),
  password_hash: z.string()
})

// Model
export const Model = z.object({
  providerOptions: z.custom<ProviderMetadata>(),
  model: z.custom<LanguageModel>()
})

/**
 * Represents a parsed user schema that extends the base `User` schema
 * by adding a `config` property. The `config` property is an array
 * of strings, allowing for additional configuration options.
 *
 * This schema can be used to validate and type-check user data
 * with additional configuration details.
 */
export const Parsed_User = User.extend({ config: z.array(z.string()) })

//
// `./assets/Config` schema
export const Config = z
  .object({
    id: z.string(),
    display: z.string(),
    show: z.array(z.string()),
    custom_data: z.object({ format: z.function() }).or(z.object({})),
    api: z
      .array(
        z.object({
          key: z.enum(['WEBHOOK_KEY_1', 'WEBHOOK_KEY_2', 'WEBHOOK_KEY_3']),
          url: z.string(), // URL check is made elsewhere
          format: z.function({
            input: [
              z.object({ custom_data: z.array(z.string()), content: z.string(), role: z.string() })
            ],
            output: z.any()
          })
        })
      )
      .default([]),
    models: z.object({ augment_with: Model, rerank_with: Model, answer_with: Model }),
    knowledge: z.object({
      community: z.boolean(),
      proprietary: z.boolean()
    }),
    disclaimer: z.string().nullable(),
    greeting: z.array(z.string()),
    examples: z.array(z.string()),
    protected: z.boolean(),
    guidelines: z.string(),
    audience: z.string(),
    persona: z.string()
  })
  .strict()

//
// Reflects datastore database schema
export const Reply = z.object({
  // Globals
  conv_id: z.string(),
  config: Config,
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
export const Augmented_Query = z.object({
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
        c.custom_data.transformed = c.config.custom_data.format(c.custom_data.raw) as string
      }
    }

    return true
  })

//
//
export type User = z.infer<typeof User>
export type Reply = z.infer<typeof Reply>
export type Model = z.infer<typeof Model>
export type Config = z.infer<typeof Config>
export type AIContext = z.infer<typeof AIContext>
export type Parsed_User = z.infer<typeof Parsed_User>
export type Augmented_Query = z.infer<typeof Augmented_Query>
