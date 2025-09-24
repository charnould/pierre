import { streamText } from 'ai'
import type { AIContext } from './_schema'
import { save_reply } from './handle-conversation'

export const stream_answer = async (context: AIContext) =>
  streamText({
    model: context.config.answer_with.model,
    providerOptions: context.config.answer_with.providerOptions,
    messages: context.conversation,
    async onFinish({ text, usage }) {
      context.metadata.tokens.completion = usage.outputTokens
      context.metadata.tokens.prompt = usage.inputTokens
      context.metadata.tokens.total = usage.totalTokens
      context.role = 'assistant'
      context.content = text

      await save_reply(context)
    }
  })
