import { z } from 'zod'

//
//
// prettier-ignore
// biome-ignore format: readability
// User
export const User = z.object({
  config        : z.string(),
  email         : z.string(),
  role          : z.enum(['administrator', 'contributor', 'collaborator']).default('collaborator'),
  password_hash : z.string()
})

//
//
// prettier-ignore
// biome-ignore format: readability
// Incoming SMS parsing schema
export const SMS = z.object({
    role              : z.string(),
    config            : z.string(),
    conv_id           : z.string(),
    current_context   : z.string().default('default'),
    phone             : z.string().nullable(),
    to                : z.string(),
    content           : z.string().trim()
  })
  .or(z.null())

//
//
// prettier-ignore
// biome-ignore format: readability
// `./assets/Config` schema
export const Config = z.object({
  id: z.string(),
  phone: z.string().nullable(),
  model: z.string(),
  context: z
    .object({
      default: z.object({
        protected : z.boolean(),
        knowledge : z.object({
          community   : z.boolean(),
          proprietary : z.object({
            public  : z.boolean(),
            private : z.boolean()
          })}),
        audience: z.string(),
        persona: z.string(),
        greeting: z.array(z.string()),
        examples: z.array(z.string()),
        disclaimer: z.string().nullable(),
      }).strict()
    })
    .and(
      z.record(
        z.string(),
        z.object({
          protected: z.boolean(),
          knowledge : z.object({
            community   : z.boolean(),
            proprietary : z.object({
              public  : z.boolean(),
              private : z.boolean()
            })}),
          audience: z.string(),
          persona: z.string(),
          greeting: z.array(z.string()),
          examples: z.array(z.string()),
          disclaimer: z.string().nullable(),
        }).strict()
      )
    )
}).strict()

//
//
// prettier-ignore
// biome-ignore format: readability
// Reflects datastore database schema
export const Reply = z.object({
  // Globals
  conv_id   : z.string(),
  config    : z.string().or(Config),
  role      : z.enum(['assistant', 'user', 'system']).default('user'),
  timestamp : z.string().datetime().nullish().default(null),
  content   : z.string(),
  // Metadata
  metadata: z.object({
      topics: z.string().trim().toLowerCase().nullish().default(null),
      origin: z.string().url().nullish().default(null),
      // Evaluation + satisfaction
      evaluation: z.object({
          // CSAT
          customer: z.object({
              score   : z.number().nullish().default(null),
              comment : z.string().nullish().default(null)
            })
            .default({}),
          // Social housing organization satisfaction
          organization: z.object({
              score   : z.number().nullish().default(null),
              comment : z.string().nullish().default(null)
            })
            .default({}),
          // AI generated customer satisfaction (CSAT)
          ai: z.object({
              score   : z.number().nullish().default(null),
              comment : z.string().nullish().default(null)
            })
            .default({}),
          // PIERRE own evaluation
          pierre: z.object({
              score   : z.number().nullish().default(null),
              comment : z.string().nullish().default(null)
            })
            .default({})
        })
        .default({}),
      // LLM usage
      tokens: z.object({
          // cache : z.number().nullish().default(null),
          prompt      : z.number().nullish().default(null),
          completion  : z.number().nullish().default(null),
          total       : z.number().nullish().default(null)
        })
        .default({})
    })
    .default({})
})

//
//
// prettier-ignore
// biome-ignore format: readability
// Structured JSON LLM must output for each request
export const Augmented_Query = z.object({
  lang                      : z.string().describe('User language (ISO 639-1)'),
  about_user                : z.string().describe('Key user details'),
  is_relevant               : z.boolean().describe('Whether the input relates to housing or domestic violence'),
  contains_profanity        : z.boolean().describe('Whether the input contains profanity'),
  standalone_questions      : z.array(z.string()).describe('Standalone user questions'),
  bm25_keywords             : z.array(z.string()).describe('Optimized BM25 keywords'),
  named_entities              : z.object({
    building                  : z.string().nullable(),
    process                   : z.string().nullable()
  }).describe('Named entities'),
  stepback_questions        : z.array(z.string()).describe('Step back questions'),
  search_queries            : z.array(z.string()).describe('Optimized web search queries'),
  hyde_answers              : z.array(z.string()).describe('Hypothetical document answers'),
  location                  : z.object({
    region                    : z.string().nullable().describe('Region name'),
    department                : z.array(z.string()).nullable().describe('Departement involved'),
    city                      : z.array(z.string()).nullable().describe('Cities involved'),
    zipcode                   : z.array(z.string()).nullable().describe('Zip codes')
    }).describe('Geographic location')
})

//
//
//
// prettier-ignore
// biome-ignore format: readability
export const AIContext = Reply
  .extend({ query: Augmented_Query.nullable().default(null) })
  .merge(
    z.object({
      chunks: z.object({
        community : z.array(z.string()).nullish().default([]),
        private   : z.array(z.string()).nullish().default([]),
        public    : z.array(z.string()).nullish().default([])
      }).default({
        community : [],
        private   : [],
        public    : [],
      }),
      current_context : z.string().default('default'),
      conversation    : z
        .array(z.object({ role: z.enum(['assistant', 'user', 'system']), content: z.string() }))
        .default([])
    })
  )
  .refine(async (c) => {
    // Change config name for config content
    if (typeof c.config === 'string')
      c.config = (await import(`../assets/${c.config}/config`)).default
    return true
  })

//
//
//
export type SMS = z.infer<typeof SMS>
export type User = z.infer<typeof User>
export type Reply = z.infer<typeof Reply>
export type Config = z.infer<typeof Config>
export type AIContext = z.infer<typeof AIContext>
export type Augmented_Query = z.infer<typeof Augmented_Query>
