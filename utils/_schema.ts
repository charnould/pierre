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
export const AIContext = z.object({
    role              : z.enum(['assistant', 'user', 'system']),
    raw               : z.string(),
    chunks            : z.array(z.string()).nullish().default(null),
    uuid              : z.string().uuid(),
    config            : z.string().or(Config),
    about_housing     : z.boolean().default(true),
    vagueness         : z.number().default(0),
    followup          : z.string().nullish().default(null),
    lang              : z.string().nullish().default(null),
    queries           : z.array(z.string()).nullish().default(null),
    stepback          : z.string().nullish().default(null),
    hyde              : z.array(z.string()).nullish().default(null),
    keywords          : z.array(z.string()).nullish().default(null),
    text_conversation : z.string().nullish().default(null),
    raw_conversation  : z.array(z.object({
                          role    : z.enum(['assistant', 'user', 'system']),
                          content : z.string()
                        })).default([]),
    usage             : z.object({
                          prompt_tokens     : z.number().nullish().default(null),
                          completion_tokens : z.number().nullish().default(null),
                          total_tokens      : z.number().nullish().default(null)
                        }).default({})
  })
  .refine(async (content) => {
    // verify that config exists
    if (typeof content.config === 'string') {
      const config = (await import('../assets/_default/config')).default
      content.config = config
    }

    // For Zod
    return true
  })

//
//
//
export type Config = z.infer<typeof Config>
export type AIContext = z.infer<typeof AIContext>
