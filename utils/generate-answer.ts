import { CoreTool, StreamTextResult } from 'ai'
import type { AIContext } from './_schema'
import { generate_answer, stream_answer } from './deliver-answer'

//
// ██╗   ██╗███████╗███████╗██████╗      █████╗ ███████╗██╗  ██╗███████╗    ███████╗ ██████╗ ██████╗
// ██║   ██║██╔════╝██╔════╝██╔══██╗    ██╔══██╗██╔════╝██║ ██╔╝██╔════╝    ██╔════╝██╔═══██╗██╔══██╗
// ██║   ██║███████╗█████╗  ██████╔╝    ███████║███████╗█████╔╝ ███████╗    █████╗  ██║   ██║██████╔╝
// ██║   ██║╚════██║██╔══╝  ██╔══██╗    ██╔══██║╚════██║██╔═██╗ ╚════██║    ██╔══╝  ██║   ██║██╔══██╗
// ╚██████╔╝███████║███████╗██║  ██║    ██║  ██║███████║██║  ██╗███████║    ██║     ╚██████╔╝██║  ██║
//  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝
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

- The response must be in ${context.lang}.
- Ensure answers are brief when appropriate but provide explanations where required for clarity.

# CONTEXT #

${context.chunks}

---

QUESTION: ${context.translated_followup}
YOUR ANSWER:
`.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
  })

  // Return...
  if (options.is_sms === false) return stream_answer(context)
  if (options.is_sms === true) return generate_answer(context)
}

//
// ██╗   ██╗███████╗███████╗██████╗     ██████╗ ███████╗ █████╗  ██████╗██╗  ██╗███████╗███████╗
// ██║   ██║██╔════╝██╔════╝██╔══██╗    ██╔══██╗██╔════╝██╔══██╗██╔════╝██║  ██║██╔════╝██╔════╝
// ██║   ██║███████╗█████╗  ██████╔╝    ██████╔╝█████╗  ███████║██║     ███████║█████╗  ███████╗
// ██║   ██║╚════██║██╔══╝  ██╔══██╗    ██╔══██╗██╔══╝  ██╔══██║██║     ██╔══██║██╔══╝  ╚════██║
// ╚██████╔╝███████║███████╗██║  ██║    ██║  ██║███████╗██║  ██║╚██████╗██║  ██║███████╗███████║
//  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝
//  █████╗     ██████╗ ███████╗ █████╗ ██████╗ ██╗      ██████╗  ██████╗██╗  ██╗
// ██╔══██╗    ██╔══██╗██╔════╝██╔══██╗██╔══██╗██║     ██╔═══██╗██╔════╝██║ ██╔╝
// ███████║    ██║  ██║█████╗  ███████║██║  ██║██║     ██║   ██║██║     █████╔╝
// ██╔══██║    ██║  ██║██╔══╝  ██╔══██║██║  ██║██║     ██║   ██║██║     ██╔═██╗
// ██║  ██║    ██████╔╝███████╗██║  ██║██████╔╝███████╗╚██████╔╝╚██████╗██║  ██╗
//

export const reach_deadlock = async (context: AIContext, options: { is_sms: boolean }) => {
  // Start with a prompt containing only chatbot persona
  let prompt = `# YOUR PERSONA #\n\n${(context.config as { persona: string }).persona}\n\n`

  // If context DOES contain profanity
  if (context.contains_profanity === true) {
    prompt += `
# OBJECTIVE #

- Politely explain that, even if your an AI, only respectful communication will be answered.
- Politely explain also you are here to help according to your persona.

# TONE #

- Respond in a formal and respectful tone at all times.
- Use formal, professional yet accessible tone.

# RESPONSE #

- The response must be in ${context.lang} ${context.lang === 'french' ? '(always use the formal "vous")' : ''}.
- The response must **not** contain smileys or emojis.

---
YOUR ANSWER:`
  }

  // If context DOES NOT contain profanity
  if (context.contains_profanity === false) {
    prompt += '# OBJECTIVE #\n\n'

    if (context.is_greeting === true) {
      prompt +=
        '- Respond to the greeting in an **enthusiastic and friendly** manner in a few words.\n'
    }
    if (context.is_about_yourself === true) {
      prompt +=
        '- Provide a **brief and professional introduction** about yourself in 30-50 words.\n'
    }
    if (context.is_about_housing === false) {
      prompt += `- Answer user question in 10-30 words and explain that while you have general knowledge about the user's query, you are **specifically designed to answer only questions about housing**.\n`
    }

    prompt += `

# YOUR RESPONSE #

- The response must be in ${context.lang} ${context.lang === 'french' ? '(always use the formal "vous")' : ''}.
- The response must **not** contain smileys or emojis.
- ${options.is_sms === true ? 'Ensure response is suited for SMS interactions.' : 'Format your answer to improve readability.'}

---

QUESTION: ${context.translated_followup}
YOUR ANSWER:`
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
