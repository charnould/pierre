import { TZDate } from '@date-fns/tz'
import { format, getISOWeek, isSameDay, parseISO } from 'date-fns'
import dedent from 'dedent'
import type { AIContext } from './_schema'
import { generate_answer, stream_answer } from './deliver-answer'

/**
 * Generates an AI answer for the user by updating the conversation context with a formatted prompt,
 * including persona, audience, guidelines, reference material, and the user's question.
 * Depending on the `is_sms` option, it either returns a complete answer or streams the answer.
 *
 * @param context - The AIContext object containing conversation history, configuration, and user input.
 * @param options - Options for answer generation.
 * @param options.is_sms - If true, generates a single answer suitable for SMS; otherwise, streams the answer.
 * @returns A promise resolving to the generated answer or a stream of the answer, depending on the options.
 */
export const answer_user = async (context: AIContext, options: { is_sms: boolean }) => {
  // Add prompt to conversation history
  context.conversation.push({
    role: 'user',
    content: dedent`

      <!-- ⚠️ Do not include any signature, name, or reference to yourself -->
    
      Generate your response using the role, audience, and behavioral guidelines defined below:
      
      # Your Role and Voice
      
      ${typeof context.config !== 'string' ? context.config.persona : ''}.
      
      # Your Audience
      
      ${typeof context.config !== 'string' ? context.config.audience : ''}.
      
      # How To Respond
      
      ${typeof context.config !== 'string' ? context.config.guidelines : ''}.
      
      # Reference Material
      
      The current date and time is: ${today_is()}.
      
      ## Internal Materials (Priority 1)
      
      ${context.chunks.private?.map((c) => `<chunk>\n${c.trim()}\n</chunk>\n`).join('')}
      ${context.chunks.public?.map((c) => `<chunk>\n${c.trim()}\n</chunk>\n`).join('')}
      
      ## Community Materials (Priority 2)
      ${context.chunks.community?.map((c) => `<chunk>\n${c.trim()}\n</chunk>\n`).join('')}
      
      ---
      
      **User Question**: ${context.content}
      
      **Your answer in "${context.query?.lang}" (ISO 639-1 format):**`
  })

  if (options.is_sms === true) return generate_answer(context)
  return stream_answer(context)
}

/**
 * Handles situations where the AI lacks specific information about a user's query,
 * guiding the response to acknowledge the limitation and suggest next steps.
 *
 * Depending on the `is_sms` option, it either generates a complete answer or streams the answer.
 *
 * @param context - The AI conversation context, including configuration, persona, audience, and query details.
 * @param options - Options for response generation.
 * @param options.is_sms - If true, generates a full answer suitable for SMS; otherwise, streams the answer.
 * @returns A promise resolving to the generated or streamed answer.
 */
export const reach_relevancy_deadlock = async (
  context: AIContext,
  options: { is_sms: boolean }
) => {
  context.conversation.push({
    role: 'user',
    content: dedent`
    
      <!-- This prompt is activated when the Retrieval Augmented Generation system fails to retrieve relevant information about the user's query, indicating the topic is outside knowledge base or the retrieval process couldn't find matching content -->

      Generate your response using the role, audience, and behavioral guidelines defined below:

      # Your Role and Voice

      ${typeof context.config !== 'string' ? context.config.persona : ''}

      # Your Audience

      ${typeof context.config !== 'string' ? context.config.audience : ''}

      # How To Respond
            
      First, acknowledge the limitation clearly: "I don't have specific information about [topic] in my knowledge base. This query falls outside the scope of my current dataset."
      
      Then, choose the appropriate response strategy:
      - For well-defined topics: Provide a brief, factual response (1-2 sentences) based on general knowledge, clearly stating: "While I can't access specific details from our database, generally speaking..."
      - For uncertain or complex topics: "I don't have enough reliable information to answer this question accurately. I prefer not to provide potentially misleading information on important matters like this."
      - Maintain consistent voice: Respond in alignment with your role and voice, using a supportive and professional tone.
      - Guide the user effectively: 
        - "To better assist you, could you rephrase your question to focus more specifically on [relevant housing aspect]?"
        - "Would you like me to help with a related housing question instead?"

      The current date and time is ${today_is()}.
      
      ---
      
      **Your answer in "${context.query?.lang}" (ISO 639-1 format):**`
  })

  if (options.is_sms === true) return generate_answer(context)
  return stream_answer(context)
}

/**
 * Handles situations where user input contains profanity, toxicity, or inappropriate content by injecting a professional, boundary-setting prompt into the conversation context.
 *
 * @param context - The AIContext object containing conversation state, configuration, and user query.
 * @param options - Options for response generation.
 * @param options.is_sms - If true, generates a single answer suitable for SMS; otherwise, streams the answer.
 * @returns A Promise resolving to either a generated answer or a streamed answer, depending on the options.
 */
export const reach_profanity_deadlock = async (
  context: AIContext,
  options: { is_sms: boolean }
) => {
  context.conversation.push({
    role: 'user',
    content: dedent`
    
      <!-- This prompt is triggered when the system detects profanity, toxicity, or other inappropriate content in the user's message -->
    
      Generate your response using the role, audience, and behavioral guidelines defined below:

      # Your Role and Voice

      ${typeof context.config !== 'string' ? context.config.persona : ''}

      # Your Audience

      ${typeof context.config !== 'string' ? context.config.audience : ''}

      # How to Respond

      **Maintain a professional boundary if a topic is being discussed:** "I understand you may feel strongly about this topic. As your housing assistant, I'm here to provide helpful information, but I can only do so in a respectful environment."
      
      **Redirect with purpose:** "Let's refocus our conversation on how I can assist with your housing needs. What specific housing information or assistance are you looking for today?"
      
      **When necessary, provide clear guidance:** "To help you effectively, I need to ask that we maintain professional communication. Could you please rephrase your question without the strong language?"
      
      **Key principles to follow:**
      - Respond with calm professionalism, never matching inappropriate tone
      - Acknowledge the user's underlying need or question when possible
      - Offer a constructive path forward rather than simply refusing service
      - Use natural, conversational language while maintaining appropriate boundaries
      - Focus on the housing-related assistance you can provide
      
      **If inappropriate content persists:** "I'm here specifically to assist with housing matters in a professional capacity. Please let me know when you're ready to discuss your housing questions or concerns."
      
      The current date and time is ${today_is()}.
      
      ---
      
      **Your answer in "${context.query?.lang}" (ISO 639-1 format):**`
  })

  if (options.is_sms === true) return generate_answer(context)
  return stream_answer(context)
}

export const today_is = () => {
  // Define public holidays
  // Source: https://www.service-public.fr/particuliers/actualites/A15406
  // TODO: Update the list of public holidays for 2027, 2028, etc.
  const public_french_holidays = [
    '2025-01-01', // Jour de l'an
    '2025-04-21', // Lundi de Pâques
    '2025-05-01', // Fête du travail
    '2025-05-08', // Victoire 1945
    '2025-05-29', // Ascension
    '2025-06-09', // Lundi de Pentecôte
    '2025-07-14', // Fête nationale
    '2025-08-15', // Assomption
    '2025-11-01', // Toussaint
    '2025-11-11', // Armistice 1918
    '2025-12-25', // Noël
    '2026-01-01', // Jour de l'an
    '2026-04-06', // Lundi de Pâques
    '2026-05-01', // Fête du travail
    '2026-05-08', // Victoire 1945
    '2026-05-14', // Ascension
    '2026-05-25', // Lundi de Pentecôte
    '2026-07-14', // Fête nationale
    '2026-08-15', // Assomption
    '2026-11-01', // Toussaint
    '2026-11-11', // Armistice 1918
    '2026-12-25', // Noël
    '2027-01-01' // Jour de l'an
  ]

  // Check if today is a public holiday
  const is_public_holiday = () =>
    public_french_holidays.some((holiday) => isSameDay(new Date(), parseISO(holiday)))

  const now = new TZDate(Date.now(), 'Europe/Paris')
  const date = format(now, 'EEEE, MMMM dd, yyyy')
  const time = format(now, 'HH:mm a')
  const week = getISOWeek(now)

  return `${date} (Week ${week}) at ${time}${is_public_holiday() ? ' – today is a French public holiday' : ''}`
}
