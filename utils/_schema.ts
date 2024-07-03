import { z } from 'zod'

//
//
//
// prettier-ignore
// biome-ignore format: readability
export const Config = z.object({
  id                  : z.string(),
  assistant           : z.string(),
  context             : z.string(),
  greeting            : z.array(z.string()),
  examples            : z.array(z.string()),
})

//
//
//
// prettier-ignore
// biome-ignore format: readability
// Reflects telemetry database schema
export const Conversation = z.array(
  z.object({
    id                  : z.string(),
    config              : z.string(),
    role                : z.enum(['assistant', 'user', 'system']),
    timestamp           : z.string(),
    content             : z.string(),
    user_score          : z.number(),
    reviewer_score      : z.number(),
    reviewer_comment    : z.string(),
    prompt_tokens       : z.number().nullish(),
    completion_tokens   : z.number().nullish(),
    total_tokens        : z.number().nullish()
  })
)

//
//
//
// prettier-ignore
// biome-ignore format: readability
export const AIContext = z.object({
    role              : z.enum(['assistant', 'user', 'system']),
    raw               : z.string(),
    chunks            : z.array(z.string()).nullish().default(null),
    id                : z.string().uuid(),
    config            : z.string().or(Config),
    about_housing     : z.boolean().default(true),
    vagueness         : z.number().default(0),
    followup          : z.string().nullish().default(null),
    lang              : z.string().nullish().default(null),
    queries           : z.array(z.string()).nullish().default(null),
    stepback          : z.string().nullish().default(null),
    hyde              : z.array(z.string()).nullish().default(null),
    keywords          : z.array(z.string()).nullish().default(null),
    conversation      : z.array(z.object({
                          role    : z.enum(['assistant', 'user', 'system']),
                          content : z.string()
                        })).default([]),
    usage             : z.object({
                          prompt_tokens     : z.number().nullish().default(null),
                          completion_tokens : z.number().nullish().default(null),
                          total_tokens      : z.number().nullish().default(null)
                        }).default({})
  })

  // Change config name for config content
  .refine(async (c) => {
    if (typeof c.config === 'string') c.config = (await import(`../assets/${c.config}/config`)).default
    return true
  })

//
//
//
export type Conversation = z.infer<typeof Conversation>
export type AIContext = z.infer<typeof AIContext>
export type Config = z.infer<typeof Config>
