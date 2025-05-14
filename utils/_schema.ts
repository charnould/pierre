import { z } from 'zod'

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
  email: z.string().trim().toLowerCase(),
  role: z.enum(['administrator', 'contributor', 'collaborator']).catch('collaborator'),
  config: z.string().trim(),
  password_hash: z.string()
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
// Incoming SMS parsing schema
export const SMS = z
  .object({
    role: z.string(),
    config: z.string(),
    conv_id: z.string(),
    phone: z.string().nullable(),
    to: z.string(),
    content: z.string().trim()
  })
  .or(z.null())

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
          format: z.function().args(
            z.object({
              custom_data: z.array(z.string()),
              content: z.string(),
              role: z.string()
            })
          )
        })
      )
      .default([]),

    models: z
      .object({
        augment_with: z.string(),
        rerank_with: z.string(),
        answer_with: z.string()
      })
      .default({
        augment_with: "openai('gpt-4o-mini-2024-07-18')",
        rerank_with: "openai('gpt-4o-mini-2024-07-18')",
        answer_with: "openai('gpt-4o-mini-2024-07-18')"
      }),
    phone: z.string().nullable(),
    protected: z.boolean(),
    knowledge: z.object({
      community: z.boolean(),
      proprietary: z.object({
        public: z.boolean(),
        private: z.boolean()
      })
    }),
    audience: z.string(),
    persona: z.string(),
    greeting: z.array(z.string()),
    examples: z.array(z.string()),
    disclaimer: z.string().nullable()
  })
  .strict()

//
// Reflects datastore database schema
export const Reply = z.object({
  // Globals
  conv_id: z.string(),
  config: z.string().or(Config),
  role: z.enum(['assistant', 'user', 'system']).default('user'),
  timestamp: z.string().datetime({ offset: true }).nullish().default(null),
  content: z.string(),
  // Metadata
  metadata: z
    .object({
      // User
      user: z.string().trim().toLowerCase().nullish().default(null),
      // Topics
      topics: z.string().trim().toLowerCase().nullish().default(null),
      // Evaluation + satisfaction
      evaluation: z
        .object({
          // CSAT
          customer: z
            .object({
              score: z.coerce.number().nullish().default(null).catch(null),
              comment: z.string().nullish().default(null)
            })
            .default({}),
          // Social housing organization satisfaction
          organization: z
            .object({
              score: z.coerce.number().nullish().default(null).catch(null),
              comment: z.string().nullish().default(null)
            })
            .default({}),
          // AI generated customer satisfaction (CSAT)
          ai: z
            .object({
              score: z.coerce.number().nullish().default(null).catch(null),
              comment: z.string().nullish().default(null)
            })
            .default({})
        })
        .default({}),
      // LLM usage
      tokens: z
        .object({
          // cache : z.number().nullish().default(null),
          prompt: z.number().nullish().default(null),
          completion: z.number().nullish().default(null),
          total: z.number().nullish().default(null)
        })
        .default({})
    })
    .default({})
})

//
// Structured JSON LLM must output for each request
export const Augmented_Query = z.object({
  lang: z.string(),
  contains_profanity: z.boolean(),
  standalone_questions: z.array(z.string()),
  bm25_keywords: z.array(z.string()),
  search_queries: z.array(z.string())
})

//
// AI Context
export const AIContext = Reply.extend({ query: Augmented_Query.nullable().default(null) })
  .merge(
    z.object({
      chunks: z
        .object({
          community: z.array(z.string()).nullish().default([]),
          private: z.array(z.string()).nullish().default([]),
          public: z.array(z.string()).nullish().default([])
        })
        .default({
          community: [],
          private: [],
          public: []
        }),
      custom_data: z.object({ raw: z.array(z.string()), transformed: z.string().default('') }),
      conversation: z
        .array(
          z.object({
            role: z.enum(['assistant', 'user', 'system']),
            content: z.string()
          })
        )
        .default([])
    })
  )
  .refine(async (c) => {
    // Change config name for config content
    if (typeof c.config === 'string') {
      c.config = (await import(`../assets/${c.config}/config`)).default
    }

    // Format data to be the one wanted by API
    if (typeof c.config !== 'string' && 'format' in c.config.custom_data) {
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
export type SMS = z.infer<typeof SMS>
export type User = z.infer<typeof User>
export type Parsed_User = z.infer<typeof Parsed_User>
export type Reply = z.infer<typeof Reply>
export type Config = z.infer<typeof Config>
export type AIContext = z.infer<typeof AIContext>
export type Augmented_Query = z.infer<typeof Augmented_Query>
