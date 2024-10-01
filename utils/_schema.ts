import { z } from 'zod'

//
//
// prettier-ignore
// biome-ignore format: readability
// Incoming SMS parsing schema
export const SMS = z.object({
  role      : z.string(),
  config    : z.string(),
  conv_id   : z.string(),
  phone     : z.string().nullable(),
  to        : z.string(),
  content   : z.string().trim()
}).or(z.null())

//
//
// prettier-ignore
// biome-ignore format: readability
// `./assets/Config` schema
export const Config = z.object({
  id        : z.string(),
  phone     : z.string().nullable(), // SMS + Voice phone number
  model     : z.string(),
  persona   : z.string(),
  context   : z.string(),
  greeting  : z.array(z.string()),
  examples  : z.array(z.string())
})

//
//
// prettier-ignore
// biome-ignore format: readability
// Reflects telemetry database schema
export const Reply = z.object({
  // Globals
  conv_id           : z.string(),
  role              : z.enum(['assistant', 'user', 'system']).default('user'),
  model             : z.string(),
  config            : z.string(),
  content           : z.string(),
  timestamp         : z.string(),
  // Satisfaction
  cus_satisfaction  : z.number().nullish(), // customer satisfaction
  org_satisfaction  : z.number().nullish(), // social housing organization satisfaction
  ext_satisfaction  : z.number().nullish(), // pierre `external `satisfaction
  cus_comment       : z.string().nullish(),
  org_comment       : z.string().nullish(),
  ext_comment       : z.string().nullish(),
  // LLM usage
  prompt_tokens     : z.number().nullish(),
  completion_tokens : z.number().nullish(),
  total_tokens      : z.number().nullish()
})

//
//
//
// prettier-ignore
// biome-ignore format: readability
export const AIContext = z.object({
    timestamp           : z.string().datetime().nullish().default(null),
    role                : z.enum(['assistant', 'user', 'system']),
    content             : z.string(),
    chunks              : z.array(z.string()).nullish().default(null),
    conv_id             : z.string(),
    config              : z.string().or(Config),
    contains_profanity  : z.boolean().default(false),
    is_greeting         : z.boolean().default(false),
    is_about_yourself   : z.boolean().default(false),
    is_about_housing    : z.boolean().default(true),
    original_followup   : z.string().nullish().default(null),
    translated_followup : z.string().nullish().default(null),
    lang                : z.string().nullish().default(null),
    queries             : z.array(z.string()).length(3).nullish().default(null),
    stepback            : z.string().nullish().default(null),
    hyde                : z.array(z.string()).nullish().default(null),
    keywords            : z.array(z.string()).length(3).nullish().default(null),
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
export type SMS = z.infer<typeof SMS>
export type Reply = z.infer<typeof Reply>
export type Config = z.infer<typeof Config>
export type AIContext = z.infer<typeof AIContext>
