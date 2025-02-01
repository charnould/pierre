import { createAnthropic } from '@ai-sdk/anthropic'
import { createCerebras } from '@ai-sdk/cerebras'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createTogetherAI } from '@ai-sdk/togetherai'
import { type CoreMessage, generateObject, generateText } from 'ai'
import type { ZodSchema } from 'zod'

const openai = createOpenAI({ compatibility: 'strict' })
const google = createGoogleGenerativeAI()
const anthropic = createAnthropic()
const mistral = createMistral()
const cohere = createCohere()
const togetherai = createTogetherAI()
const groq = createGroq()
const cerebras = createCerebras()

/**
 * Generates text based on the provided messages and model.
 *
 * @param {Object} params - The parameters for text generation.
 * @param {CoreMessage[]} params.messages - An array of messages to be used for generating the text.
 * @param {string} params.model - The model to be used for text generation.
 * @returns {Promise<string>} A promise that resolves to the generated text.
 * @throws Will throw an error if text generation fails.
 */
export const generate_text = async ({
  messages,
  model,
  max_tokens
}: {
  messages: CoreMessage[]
  model: string
  max_tokens: number | undefined
}): Promise<string> => {
  try {
    const { text } = await generateText({
      // biome-ignore lint: server-side
      model: eval(model),
      messages: messages,
      maxTokens: max_tokens
    })
    return text
  } catch (err) {
    console.error(err)
    throw err
  }
}

/**
 * Generates an object based on the provided messages, schema, and model.
 *
 * @param {Object} params - The parameters for object generation.
 * @param {CoreMessage[]} params.messages - An array of messages to be used for generating the object.
 * @param {ZodSchema} params.schema - The schema to be used for object generation.
 * @param {string} params.model - The model to be used for object generation.
 * @returns {Promise<Object>} A promise that resolves to the generated object.
 * @throws Will throw an error if object generation fails.
 */
export const generate_object = async ({
  messages,
  schema,
  model
}: {
  messages: CoreMessage[]
  schema: ZodSchema
  model: string
}): Promise<object> => {
  try {
    const { object } = await generateObject({
      // biome-ignore lint: server-side eval
      model: eval(model),
      messages: messages,
      schema: schema
    })
    return object
  } catch (err) {
    console.error(err)
    throw err
  }
}
