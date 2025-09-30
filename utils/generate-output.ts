/****
 * Utility functions for generating AI text outputs using specified models and providers.
 * Includes synchronous text generation and streaming text generation with context saving.
 ****/

import { generateText, ModelMessage, streamText, StreamTextResult, Tool } from 'ai'
import type { AIContext, Model } from './_schema'
import { save_reply } from './handle-conversation'

/**
 * Generates text by sending a chat completion request to the specified provider and model.
 *
 * @param {Object} params - The parameters for text generation.
 * @param {Model} params.model - The model configuration object, including model identifier and provider options.
 * @param {ModelMessage[]} params.messages - An array of message objects representing the conversation history to send to the model.
 * @param {number | undefined} params.max_tokens - Optional maximum number of tokens to generate in the response.
 *
 * @returns {Promise<string>} A promise that resolves to the generated text content as a string.
 *
 * @throws Will throw an error if the chat completion request fails, with additional context.
 */
export const generate_text = async ({
  model,
  messages,
  max_tokens
}: {
  model: Model
  messages: ModelMessage[]
  max_tokens: number | undefined
}): Promise<string> => {
  try {
    const { text } = await generateText({
      model: model.model,
      messages: messages,
      maxOutputTokens: max_tokens,
      providerOptions: model.providerOptions
    })
    return text
  } catch (e) {
    console.error('Error in generate_text:', e)
    throw new Error(`generate_text failed: ${e instanceof Error ? e.message : String(e)}`)
  }
}

/**
 * Streams generated text from the AI model based on the given context and model configuration.
 *
 * @param {Object} params - The parameters for streaming text generation.
 * @param {AIContext} params.context - The AI context containing conversation history and metadata.
 * @param {Model} params.model - The model configuration object, including model identifier and provider options.
 *
 * @throws Will throw an error if the streaming request fails, with additional context.
 *
 * @description
 * Calls the streaming text generation API and updates the context metadata and content upon completion.
 * The onFinish callback saves the generated reply using the provided save_reply function.
 */
export const stream_text = async ({
  model,
  context
}: {
  model: Model
  context: AIContext
}): Promise<StreamTextResult<Record<string, Tool>, unknown>> => {
  try {
    return streamText({
      model: model.model,
      messages: context.conversation,
      providerOptions: model.providerOptions,
      async onFinish({ text, usage }) {
        context.metadata.tokens.completion = usage.outputTokens ?? null
        context.metadata.tokens.prompt = usage.inputTokens ?? null
        context.metadata.tokens.total = usage.totalTokens ?? null
        context.role = 'assistant'
        context.content = text
        await save_reply(context)
      }
    })
  } catch (e) {
    console.error('Error in stream_text:', e)
    throw new Error(`stream_text failed: ${e instanceof Error ? e.message : String(e)}`)
  }
}
