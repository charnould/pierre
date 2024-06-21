import { z } from 'zod'
import clients from '../config/pierre'

//
//
//
// biome-ignore format: readability
export const Config = z.object({
  config    : z.string(),
  keywords  : z.string().nullish(),
  greeting  : z.string(),
  examples      : z.array(z.string())
})

export type Config = z.infer<typeof Config>

//
//
//
// biome-ignore format: readability
export const AIContext = z
  .object({
    role              : z.enum(['assistant', 'user']),
    raw               : z.string(),
    chunks            : z.array(z.string()).nullish().default(null),
    uuid              : z.string().uuid(),
    config            : z.string().or(Config.omit({ greeting: true, examples: true })),
    about_housing     : z.boolean().default(true),
    vagueness         : z.number().default(0),
    follow_up         : z.string().nullish().default(null),
    lang              : z.string().nullish().default(null),
    queries           : z.array(z.string()).nullish().default(null),
    stepback          : z.string().nullish().default(null),
    hyde              : z.array(z.string()).nullish().default(null),
    keywords          : z.array(z.string()).nullish().default(null),
    text_conversation : z.string().nullish().default(null),
    raw_conversation  : z.array(z.object({ role: z.enum(['assistant', 'user', 'system']), content: z.string() })).default([]),
  })
  .refine((content) => {
    // verify that config exists
    if (typeof content.config === 'string') {
      const config = clients.config.find((c) => c.config === content.config)
      content.config = config
    }

    // For Zod
    return true
  })

export type AIContext = z.infer<typeof AIContext>
