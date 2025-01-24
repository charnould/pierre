import { expect, test } from 'bun:test'
import { cerebras } from '@ai-sdk/cerebras'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { convert_to_array } from '../../utils/convert-to-array'

test('evaluate LLM perf.', async () => {
  const model = cerebras('llama-3.3-70b')
  //
  //
  // Test to return a simple structured object
  performance.mark('go_start')

  const { object } = await generateObject({
    model: model,
    messages: [
      {
        role: 'user',
        content: 'Return 3 sentences of 15 words each.'
      }
    ],
    schema: z.object({
      s: z.array(z.string().describe('a random sentence')).describe('3 random sentences')
    })
  })

  performance.mark('go_end')

  //
  //
  // Test to return text
  performance.mark('gt_start')

  const { text } = await generateText({
    model: model,
    messages: [
      {
        role: 'user',
        content: 'Return 3 sentences of 15 words each. Sentence must be separated by a pipe |.'
      }
    ]
  })

  const arrayified_text = convert_to_array(text)

  performance.mark('gt_end')

  //
  //
  // Log performance and output
  console.table([
    ['Object', `${performance.measure('p', 'go_start', 'go_end').duration}ms`],
    ['Text  ', `${performance.measure('p', 'gt_start', 'gt_end').duration}ms`]
  ])

  console.log('OBJECT: ', object)
  console.log('TEXT: ', arrayified_text)

  // Dummy expect: this test is manually checked/used
  expect(true).toBe(true)
})
