import { createAnthropic } from '@ai-sdk/anthropic'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import remove_markdown from 'remove-markdown'
import type { AIContext } from './_schema'
import { save_reply } from './handle-conversation'

const openai = createOpenAI({ compatibility: 'strict' })
const google = createGoogleGenerativeAI()
const anthropic = createAnthropic()
const mistral = createMistral()
const cohere = createCohere()

//
// If incoming conversation comes from the World Wide Web,
// answer with a:
//
// ███████╗████████╗██████╗ ███████╗ █████╗ ███╗   ███╗
// ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██╔══██╗████╗ ████║
// ███████╗   ██║   ██████╔╝█████╗  ███████║██╔████╔██║
// ╚════██║   ██║   ██╔══██╗██╔══╝  ██╔══██║██║╚██╔╝██║
// ███████║   ██║   ██║  ██║███████╗██║  ██║██║ ╚═╝ ██║
// ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
//

export const stream_answer = async (context: AIContext) =>
  streamText({
    // biome-ignore lint: server-side eval to keep `config.ts` simple
    model: eval((context.config as { model: string }).model),
    messages: context.conversation,
    async onFinish({ text, usage }) {
      context.metadata.tokens.completion = usage.completionTokens
      context.metadata.tokens.prompt = usage.promptTokens
      context.metadata.tokens.total = usage.totalTokens
      context.role = 'assistant'
      context.content = text

      save_reply(context, true)
    }
  })

//
// If incoming conversation is a SMS,
// answer with a simple:
//
// ████████╗███████╗██╗  ██╗████████╗
// ╚══██╔══╝██╔════╝╚██╗██╔╝╚══██╔══╝
//    ██║   █████╗   ╚███╔╝    ██║
//    ██║   ██╔══╝   ██╔██╗    ██║
//    ██║   ███████╗██╔╝ ██╗   ██║
//    ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝
//

export const generate_answer = async (context: AIContext) => {
  const { text, usage } = await generateText({
    // biome-ignore lint: server-side eval to keep `config.ts` simple
    model: eval((context.config as { model: string }).model),
    messages: context.conversation
  })

  const plain_text = remove_markdown(text)

  context.metadata.tokens.completion = usage.completionTokens
  context.metadata.tokens.prompt = usage.promptTokens
  context.metadata.tokens.total = usage.totalTokens
  context.role = 'assistant'
  context.content = plain_text

  save_reply(context, true)

  return plain_text
}
