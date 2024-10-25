import { CoreTool, StreamTextResult } from 'ai'
import type { AIContext } from './_schema'
import { generate_answer, stream_answer } from './deliver-answer'

//
//  ██████╗██╗     ███████╗██╗   ██╗███████╗██████╗ ███╗   ██╗███████╗███████╗███████╗
// ██╔════╝██║     ██╔════╝██║   ██║██╔════╝██╔══██╗████╗  ██║██╔════╝██╔════╝██╔════╝
// ██║     ██║     █████╗  ██║   ██║█████╗  ██████╔╝██╔██╗ ██║█████╗  ███████╗███████╗
// ██║     ██║     ██╔══╝  ╚██╗ ██╔╝██╔══╝  ██╔══██╗██║╚██╗██║██╔══╝  ╚════██║╚════██║
// ╚██████╗███████╗███████╗ ╚████╔╝ ███████╗██║  ██║██║ ╚████║███████╗███████║███████║
//

export const answer_user = async (context: AIContext, options: { is_sms: boolean }) => {
  //
  // Add prompt to conversation history
  context.conversation.push({
    role: 'user',
    content: `
    
# YOUR PERSONA #

${(context.config as { persona: string }).persona}
      
# OBJECTIVE #

1. Answer questions strictly based on the context provided below.
2. Do not generate information outside the provided context.
3. Break the question down into smaller, atomic questions as needed to clarify the response.
4. For each atomic question:
  - Define key terms clearly.
  -	Extract and prioritize the most relevant information from the context, considering the conversation history.
  -	Generate a concise and clear draft using the selected information, ensuring explanations are appropriate to the user’s needs.
  -	Exclude any content already answered in the conversation and remove duplicate content.
5. Ensure the final response is adjusted for accuracy and relevance, providing clarity and depth where needed.

# STYLE #

- Adopt the writing style of social housing experts, ensuring the language is professional yet accessible.
- ${options.is_sms === true ? 'Tailor the response for communication via SMS.' : 'Use formal, professional language.'}

# TONE #

Maintain a professional and supportive tone, appropriate for engaging with individuals who are candidates or tenants of social housing.

# AUDIENCE #

- Your audience consists of social housing candidates or tenants seeking clear, straightforward answers to everyday questions.
- ${options.is_sms === true ? 'Ensure the communication is suited for SMS interactions.' : 'Provide clarity and thoroughness in your response.'}

# RESPONSE #

- The response must be in ${context.query.lang}.
- Ensure answers are brief when appropriate but provide explanations where required for clarity.

# CONTEXT #

${context.chunks}

---

QUESTION: ${context.content}
YOUR ANSWER:
`.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
  })

  // Return...
  if (options.is_sms === false) return stream_answer(context)
  if (options.is_sms === true) return generate_answer(context)
}

//
// ██████╗ ███████╗ █████╗ ██████╗ ██╗      ██████╗  ██████╗██╗  ██╗
// ██╔══██╗██╔════╝██╔══██╗██╔══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝
// ██║  ██║█████╗  ███████║██║  ██║██║     ██║   ██║██║     █████╔╝
// ██║  ██║██╔══╝  ██╔══██║██║  ██║██║     ██║   ██║██║     ██╔═██╗
// ██████╔╝███████╗██║  ██║██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗
//

export const reach_deadlock = async (context: AIContext, options: { is_sms: boolean }) => {
  // Start with a prompt containing only chatbot persona
  let prompt = `

# YOUR PERSONA #

${(context.config as { persona: string }).persona}`

  // If context DOES contain profanity
  if (context.query?.contains_profanity) {
    prompt += `

# INSTRUCTION

- You are a polite and respectful AI assistant.
- Respond with a calm, friendly reminder that you are here to help but will only respond to polite, respectful conversation.
- Encourage the user to rephrase their question courteously, as mutual respect is key to effective communication.
- Always respond in a positive, understanding tone that keeps the conversation constructive.
- Omit emoticons, emojis, or informal punctuation.
- Explain you are here to help according to your [persona].

---

Your answer in ${context.query.lang} (ISO 639-1 format):`
  }

  // If context DOES NOT contain profanity
  else {
    prompt += `
    
# INSTRUCTIONS

- You are a courteous and focused assistant.
- Always use context from previous messages.
- Avoid repetitive disclaimers.
- Language-specific considerations: formal "vous" in French.

- Respond briefly in one or two sentences.
- However if a question is about yourself or your capabilities, respond openly and in detail as appropriate.
- Then follow up by:
  - Reminding user what kind of question you can ONLY answer.
  - Encouraging user to ask questions where you can be most effective.

---

Question: ${context.content}
Your answer in ${context.query?.lang}:`
  }

  // Add prompt to conversation history
  context.conversation.push({
    role: 'user',
    content: prompt.trim()
  })

  // Return...
  if (options.is_sms === false) return stream_answer(context)
  if (options.is_sms === true) return generate_answer(context)
}
