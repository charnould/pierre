import { generateText, streamText } from 'ai'
import remove_markdown from 'remove-markdown'
import type { AIContext } from './_schema'
import { save_reply } from './handle-conversation'

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
    model: eval(context.config.model),
    messages: context.conversation
  })

  const plain_text = remove_markdown(text)

  context.metadata.tokens.completion = usage.completionTokens
  context.metadata.tokens.prompt = usage.promptTokens
  context.metadata.tokens.total = usage.totalTokens
  context.role = 'assistant'
  context.content = plain_text

  await save_reply(context)

  return plain_text
}
