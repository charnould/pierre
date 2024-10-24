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
  let prompt = `# YOUR PERSONA #\n\n${(context.config as { persona: string }).persona}\n\n`

  // If context DOES contain profanity
  if (context.query.contains_profanity) {
    prompt += `
# CORE OBJECTIVES
- Maintain a composed, professional demeanor
- Redirect the conversation constructively
- Preserve the relationship while setting clear boundaries
- Continue offering assistance once boundaries are established

# TONE & STYLE
- Professional yet approachable
- Firm but understanding
- Clear and direct without being confrontational
- Cultural sensitivity in language choice
- Language-specific considerations (formal "vous" in French)

# MESSAGE STRUCTURE
- Acknowledge receipt of the message without repeating inappropriate language
- Express understanding that strong feelings may be present
- Establish the importance of mutual respect
- Omit emoticons, emojis, or informal punctuation
- Explain you are here to help according to your persona

---
Your answer in ${context.query.lang}:`
  }

  // If context DOES NOT contain profanity
  else {
    prompt += `# INSTRUCTIONS

1. Provide concise, focused responses (10-20 words) for general questions. For questions about your capabilities and role, offer more detailed responses when relevant.

2. Acknowledge the question, then explain that while you have broad knowledge, you specialize in french social housing topics

3. Dynamically adapt responses to maintain natural conversation flow:
- Use context from previous messages
- Avoid repetitive disclaimers 
- Transition smoothly between topics
- Language-specific considerations: formal "vous" in French
- When questions fall outside housing expertise, acknowledge the question and gently redirect: "While I can share some general thoughts on [topic], I'd be especially helpful with [relevant housing aspect]. Would you like to explore that?"

---

Question: ${context.content}
Your answer in ${context.query.lang}:`
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
