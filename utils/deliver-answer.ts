import { createAnthropic } from '@ai-sdk/anthropic'
import { createCerebras } from '@ai-sdk/cerebras'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createTogetherAI } from '@ai-sdk/togetherai'
import { generateText, smoothStream, streamText } from 'ai'
import remove_markdown from 'remove-markdown'
import type { AIContext } from './_schema'
import { save_reply } from './handle-conversation'

const openai = createOpenAI({ compatibility: 'strict' })
const google = createGoogleGenerativeAI()
const anthropic = createAnthropic()
const mistral = createMistral()
const cohere = createCohere()
const togetherai = createTogetherAI()
const groq = createGroq()
const cerebras = createCerebras()

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
    model: eval(context.config.context[context.current_context].models.answer_with),
    experimental_transform: smoothStream({ delayInMs: 20 }),
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
    model: eval(context.config.context[context.current_context].models.answer_with),
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
