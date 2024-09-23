import { z } from 'zod'

//
//
//
// prettier-ignore
// biome-ignore format: readability
export const Config = z.object({
  id                  : z.string(),
  model               : z.string(),
  persona             : z.string(),
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
export const Reply = z.object({
    id                  : z.string().uuid(),
    config              : z.string(),
    // TODO: make DSI able to pass the model they are using (for telemetry)
    model               : z.string().default('gpt-4o-mini-2024-07-18'),
    role                : z.enum(['assistant', 'user', 'system']),
    timestamp           : z.string(),
    content             : z.string(),
    user_score          : z.number().nullish(),
    reviewer_score      : z.number().nullish(),
    reviewer_comment    : z.string().nullish(),
    prompt_tokens       : z.number().nullish(),
    completion_tokens   : z.number().nullish(),
    total_tokens        : z.number().nullish()
  })

//
//
//
// prettier-ignore
// biome-ignore format: readability
export const AIContext = z.object({
    timestamp           : z.string().datetime().nullish().default(null),
    role                : z.enum(['assistant', 'user', 'system']),
    // TODO: make DSI able to pass the model they are using (for telemetry)
    model               : z.string().default('gpt-4o-mini-2024-07-18'),
    content             : z.string(),
    chunks              : z.array(z.string()).nullish().default(null),
    id                  : z.string().uuid(),
    config              : z.string().or(Config),
    contains_profanity  : z.boolean().default(false),
    is_greeting         : z.boolean().default(false),
    is_about_yourself   : z.boolean().default(false),
    is_about_housing    : z.boolean().default(true),
    original_followup   : z.string().nullish().default(null),
    translated_followup : z.string().nullish().default(null),
    lang                : z.string().nullish().default(null),
    queries             : z.array(z.string()).nullish().default(null),
    stepback            : z.string().nullish().default(null),
    hyde                : z.array(z.string()).nullish().default(null),
    keywords            : z.array(z.string()).nullish().default(null),
    conversation        : z.array(z.object({
                          role    : z.enum(['assistant', 'user', 'system']),
                          content : z.string()
                        })).default([]),
    usage               : z.object({
                          prompt_tokens     : z.number().nullish().default(null),
                          completion_tokens : z.number().nullish().default(null),
                          total_tokens      : z.number().nullish().default(null)
                        }).default({})
  })
  .refine(async (c) => {
    // Change config name for config content
    if (typeof c.config === 'string') c.config = (await import(`../assets/${c.config}/config`)).default
    return true
  })

//
//
//
export type Reply = z.infer<typeof Reply>
export type Config = z.infer<typeof Config>
export type AIContext = z.infer<typeof AIContext>
