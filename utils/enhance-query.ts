import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { AIContext } from './_schema'

const openai = createOpenAI({ compatibility: 'strict' })

//
// ███████╗███╗   ██╗██╗  ██╗ █████╗ ███╗   ██╗ ██████╗███████╗
// ██╔════╝████╗  ██║██║  ██║██╔══██╗████╗  ██║██╔════╝██╔════╝
// █████╗  ██╔██╗ ██║███████║███████║██╔██╗ ██║██║     █████╗
// ██╔══╝  ██║╚██╗██║██╔══██║██╔══██║██║╚██╗██║██║     ██╔══╝
// ███████╗██║ ╚████║██║  ██║██║  ██║██║ ╚████║╚██████╗███████╗
// ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
//  ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗
// ██╔═══██╗██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝
// ██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝
// ██║▄▄ ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝
// ╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║
//

export const enhance_query = async (context: AIContext) => {
  //
  let txt_conversation = ''
  for (const c of context.conversation) {
    const role = c.role.toUpperCase()
    txt_conversation += `<${role}>${c.content}</${role}>\n`
  }

  //
  const { object } = await generateObject({
    model: openai('gpt-4o-mini-2024-07-18'),
    temperature: 0.5,
    // prettier-ignore
    // biome-ignore format: readability
    schema: z.object({
      lang                : z.string().min(1).toLowerCase().describe('User language (in English)'),
      contains_profanity  : z.boolean().describe('Does the user input contain profanity?'),
      is_greeting         : z.boolean().describe('Is the input a greeting?'),
      is_about_yourself   : z.boolean().describe('Is the input about the assistant itself?'),
      is_about_housing    : z.boolean().describe('Is the input about housing?'),
      original_followup   : z.string().min(1).describe('Original user follow-up'),
      translated_followup : z.string().min(1).describe('Original user follow-up, or follow-up translated into French if needed'),
      queries             : z.array(z.string()).length(3).describe('Optimized search queries for a web search'),
      stepback            : z.string().min(1).describe('A more generic step-back question'),
      hyde                : z.array(z.string()).length(3).describe('Three short sentences for queries and step-back')
      }),
    mode: 'json',
    messages: [
      {
        role: 'system',
        content: `
### CONVERSATION ###

${txt_conversation}

### CONTEXT ###

- **user**: ${(context.config as { context: string }).context}
- **assistant**: ${(context.config as { persona: string }).persona}

### INSTRUCTIONS ###

You are an advanced AI assistant specializing in social housing-related queries.
Given the conversation and context above, tour task is to analyze user input and provide structured information to enhance the retrieval and generation process.

1. **Detect Language**: Identify the language used in the follow-up.
2. **Profanity Check**: Check if there is any offensive language in the last message.
3. **Greeting Detection**: Determine if the last input is a greeting or signals the end of the discussion.
4. **Self-Reference**: Check if the user’s question is about the assistant (such as its identity, creator, etc.).
5. **Rephrase**: Reword the user’s follow-up into a clearer standalone question.
6. **Translation**: If required, translate the follow-up into French.
7. **Housing Relevance**: Determine if the user’s question relates to housing topics.
8. **Query Generation**: Suggest three optimized search queries in French for web-based retrieval.
9. **Step-back Question**: Paraphrase the original question to make it more generic.
10. **Response**: Provide concise and accurate answers in French based on the previous steps.

Be careful to use context and conversation.
Answer only in French language.
Your response should be returned in JSON format.`.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
      }
    ]
  })
  return object
}
