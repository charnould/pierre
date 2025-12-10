import { TZDate } from '@date-fns/tz'
import { format, getISOWeek, isSameDay, parseISO } from 'date-fns'
import type { AIContext } from './_schema'
import { stream_text } from './generate-output'
import { compile_prompt } from './compile_prompt'

/**
 * Generate an AI answer by compiling a prompt from the provided context and streaming the model response.
 *
 * The function performs the following steps:
 * 1. Compiles a prompt with injected variables:
 * 2. Appends the compiled prompt to `context.conversation`.
 * 3. Calls and returns the result of `stream_text({})`.
 *
 * Side effects:
 * - Mutates `context.conversation` by pushing the compiled prompt.
 *
 * @param context - The AI runtime context. Expected properties used by this function include:
 *
 * @returns The value returned by `stream_text` (typically an asynchronous stream or a Promise resolving to streamed text; exact type depends on `stream_text` implementation).
 *
 * @throws If `compile_prompt` or `stream_text` throw/reject, the error will propagate to the caller.
 *
 * @remarks
 * - If `context.chunks.proprietary` or `context.chunks.community` are undefined or empty, the corresponding prompt sections will be empty strings.
 * - The function relies on helper functions `compile_prompt` and `today_is()` and on the shape of chunk objects to build the prompt.
 */
export const answer_user = async (context: AIContext) => {
  // Compile prompt
  const prompt = await compile_prompt(context.config.id, 'answer', {
    today: today_is(),
    lang: context.query?.lang,
    user_query: context.content,
    location: context.config.knowledge.location,
    internal_materials: context.chunks.proprietary
      ?.map((c) => `<chunk source="${c.chunk_file}">\n${c.chunk_text}\n</chunk>\n`)
      .join(''),
    community_materials: context.chunks.community
      ?.map((c) => `<chunk source="${c.chunk_file}">\n${c.chunk_text}\n</chunk>\n`)
      .join('')
  })

  // Add prompt to conversation history
  context.conversation.push({ role: 'user', content: prompt })

  return stream_text({ context: context, model: context.config.models.answer_with })
}

/**
 * Generates a "deadlock" relevancy prompt based on the provided AI context,
 * appends it to the conversation history, and streams the model's response.
 *
 * @param context - The AIContext containing configuration, conversation history, and query parameters.
 * @returns A Promise that resolves to the streamed text response from the specified model.
 */
export const reach_relevancy_deadlock = async (context: AIContext) => {
  // Compile prompt
  const prompt = await compile_prompt(context.config.id, 'deadlock', {
    today: today_is(),
    lang: context.query?.lang
  })

  // Add prompt to conversation history
  context.conversation.push({ role: 'user', content: prompt })

  return stream_text({ context: context, model: context.config.models.answer_with })
}

/**
 * Generates a response to a profanity-related prompt and streams the answer.
 *
 * This function compiles a prompt based on the provided AI context, specifically
 * targeting the 'profanity' scenario. It adds the generated prompt to the conversation
 * history as a user message, then streams a response using the configured answer model.
 *
 * @param context - The AIContext containing configuration, conversation history, and query parameters.
 * @returns A promise that resolves to the streamed text response.
 */
export const reach_profanity_deadlock = async (context: AIContext) => {
  // Compile prompt
  const prompt = await compile_prompt(context.config.id, 'profanity', { lang: context.query?.lang })

  // Add prompt to conversation history
  context.conversation.push({ role: 'user', content: prompt })

  return stream_text({ context: context, model: context.config.models.answer_with })
}

/**
 * Returns a human-readable string describing the current date, ISO week number and time,
 * and indicates if today is one of the predefined French public holidays.
 *
 * Returns:
 * - A single string with the formatted date, ISO week and time. If today matches one of the predefined
 *   French public holidays, the string ends with " – today is a French public holiday".
 *
 * Example:
 * - "Monday, July 14, 2025 (Week 29) at 09:30 AM – today is a French public holiday"
 *
 * @returns {string} Formatted date, ISO week and time, with an optional French public holiday indicator.
 */
export const today_is = (): string => {
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
