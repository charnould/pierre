import { createAnthropic } from '@ai-sdk/anthropic'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import type { AIContext } from './_schema'
import { save_reply } from './handle-conversation'
import { reformat_markdown } from './reformat-markdown'

const openai = createOpenAI({ apiKey: Bun.env.OPENAI_API_KEY, compatibility: 'strict' })
const google = createGoogleGenerativeAI({ apiKey: Bun.env.GOOGLE_API_KEY })
const anthropic = createAnthropic({ apiKey: Bun.env.ANTHROPIC_API_KEY })
const mistral = createMistral({ apiKey: Bun.env.MISTRAL_API_KEY })
const cohere = createCohere({ apiKey: Bun.env.COHERE_API_KEY })

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
  await streamText({
    model: openai('gpt-4o-mini-2024-07-18'),
    messages: context.conversation,
    async onFinish({ text, usage }) {
      context.usage.completion_tokens = usage.completionTokens
      context.usage.prompt_tokens = usage.promptTokens
      context.usage.total_tokens = usage.totalTokens
      context.role = 'assistant'
      context.content = text
      save_reply(context, true)
    }
  })

//
// If incoming conversation comes from whatsapp,
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
    model: openai('gpt-4o-mini-2024-07-18'),
    messages: context.conversation
  })

  let reformatted_text = reformat_markdown(text)

  // WhatsApp limits message length
  if (reformatted_text.length >= 1600)
    reformatted_text =
      'Aie.\nLa réponse générée est trop longue pour WhatsApp...\nEssayez de me poser une autre question !'

  context.usage.completion_tokens = usage.completionTokens
  context.usage.prompt_tokens = usage.promptTokens
  context.usage.total_tokens = usage.totalTokens
  context.role = 'assistant'
  context.content = reformatted_text
  save_reply(context, true)

  return reformatted_text
}
