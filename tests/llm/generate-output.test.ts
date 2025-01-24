import { describe, expect, it } from 'bun:test'
import type { CoreMessage } from 'ai'
import { z } from 'zod'
import { generate_object, generate_text } from '../../utils/generate-output'

describe('generate_text', () => {
  it('should generate simple text', async () => {
    const messages: CoreMessage[] = [
      { role: 'user', content: 'Hello, world!' },
      { role: 'system', content: 'Say a joke.' }
    ]
    const text = await generate_text({
      messages: messages,
      model: "openai('gpt-4o-mini-2024-07-18')"
    })
    expect(text).toBe(
      'Why did the scarecrow win an award? \n\nBecause he was outstanding in his field!'
    )
  })

  it('should generate a simple object', async () => {
    const messages: CoreMessage[] = [
      { role: 'user', content: 'Hi' },
      { role: 'system', content: 'Generate a joke' }
    ]

    const schema = z.object({ joke: z.string().describe('The joke') })
    const text = await generate_object({
      messages: messages,
      schema: schema,
      model: "openai('gpt-4o-mini-2024-07-18')"
    })
    expect(text).toEqual({
      joke: "Why don't scientists trust atoms? Because they make up everything!"
    })
  })
})
