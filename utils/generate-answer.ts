import type { AIContext } from './_schema'
import { generate_answer, stream_answer } from './deliver-answer'

//
//
//
//
//
// Answer with intelligence
//
//
//
//
//

export const answer_user = async (context: AIContext, options: { is_sms: boolean }) => {
  // Add prompt to conversation history
  context.conversation.push({
    role: 'user',
    content: `
    
# YOUR PERSONA

${context.config.context[`${context.current_context}`].persona}.

# OBJECTIVE

Your task is to provide responses rooted strictly in the provided context.
Follow these steps to ensure clarity, relevance, and accuracy:

1. Engage with Empathy
  - Start with a brief, friendly acknowledgment of the user’s question (e.g. "I’m glad to assist with this.").
  - Use approachable language to show understanding and respect.

2. Clarify & Break Down Questions
  - Break down each question into smaller, manageable parts.
  - Define key terms as needed to ensure understanding.
  
3. Context-Based Responses Only
  - Answer using only information from the context below, enriched by conversation history if helpful.
  - Exclude repetition and previously answered content to maintain a fresh, relevant response.

4. Draft Thoughtfully
  - Identify and prioritize essential information for each part of the question.
  - Ensure the answer remains concise, complete, and appropriately detailed based on the user’s needs.

${
  options.is_sms === true
    ? `
  5. Keep Responses Easy to Follow
  - Add quick transitions where it helps responses feel natural and friendly.
  - Use line breaks between ideas for clarity.
  - No bullet points, titles, or hyperlinks—only line breaks and dashes to organize information and include full web addresses when needed.
  `
    : `
  5. Organize Response
  - Where suitable, structure the answer with relevant titles or bullet points for clarity and flow.
  - When appropriate, include brief transitional phrases to ensure a smooth, conversational flow.
`
}

6. Finalize for Clarity & Precision
  - Adjust for both accuracy and relevance, ensuring explanations are as clear and thorough as necessary.
  - Proofread for coherence, removing unnecessary jargon and enhancing readability.

# STYLE

Adopt the professional, accessible tone of social housing specialists.
Maintain clarity and simplicity in language, ensuring accessibility for all audiences.

# YOUR AUDIENCE

- ${context.config.context[`${context.current_context}`].audience}.
- ${context.query?.about_user}.
- user's location: ${context.query?.location.city !== null ? `${context.query?.location.city} (${context.query?.location.zipcode}),` : ''} ${context.query?.location.department !== null ? `${context.query?.location.department}, ` : ''} ${context.query?.location.region !== null ? `${context.query?.location.region}.` : ''}

# CONTEXT

${context.chunks}

---

Question: ${context.content}.

Your answer in "${context.query?.lang}" (ISO 639-1 format):`.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
  })

  if (options.is_sms === false) return stream_answer(context)
  if (options.is_sms === true) return generate_answer(context)
}

//
//
//
//
//
// Answer with deadlock
//
//
//
//
//

export const reach_deadlock = async (context: AIContext, options: { is_sms: boolean }) => {
  // Start with a prompt containing only chatbot persona
  let prompt = `# YOUR PERSONA\n\n ${context.config.context[`${context.current_context}`].persona}.`

  // If context DOES contain profanity
  if (context.query?.contains_profanity) {
    prompt += `

# INSTRUCTIONS

- You are a polite and respectful AI assistant.
- Respond with a calm, friendly reminder that you are here to help but will only respond to polite, respectful conversation.
- Encourage the user to rephrase their question courteously, as mutual respect is key to effective communication.
- Always respond in a positive, understanding tone that keeps the conversation constructive.
- Omit emoticons, emojis, or informal punctuation.
- Explain you are here to help according to your [persona].

---

Your answer in "${context.query.lang}" (ISO 639-1 format):`
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

Question: ${context.content}.

Your answer in "${context.query?.lang}" (ISO 639-1 format):`
  }

  context.conversation.push({ role: 'user', content: prompt.trim() })

  if (options.is_sms === false) return stream_answer(context)
  if (options.is_sms === true) return generate_answer(context)
}
