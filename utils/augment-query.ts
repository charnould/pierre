import type { CoreMessage } from 'ai'
import dedent from 'dedent'
import { type AIContext, Augmented_Query } from './_schema'
import { convert_to_array } from './convert-to-array'
import { today_is } from './generate-answer'
import { generate_text } from './generate-output'

/**
 * Augments the user's query by analyzing the conversation context and
 * generating various types of information such as language code, location,
 * profanity check, user profile, standalone questions, search queries, BM25
 * keywords, step-back questions, and Hyde answers.
 *
 * @param {AIContext} context - The context of the AI conversation, including
 * the conversation history and configuration.
 * @returns {Promise<Augmented_Query>} - A promise that resolves to an augmented
 * query object containing the analyzed and generated information.
 *
 * The function performs the following steps:
 * 1. Starts performance measurement.
 * 2. Defines multiple prompts for generating augmented queries
 * 3. Uses the specified model to generate responses for each prompt.
 * 4. Parses the generated responses into an `Augmented_Query` object.
 * 5. Ends performance measurement and logs the duration.
 * 6. Logs and returns the augmented query object.
 */
export const augment_query = async (context: AIContext) => {
  // Start performance measurement
  performance.mark('start')

  // Multiple prompts used to generate augmented queries. The goal is to enhance
  // query variety and capture different aspects of the user's intent.

  // Prompt checked on january 24 2025
  const lang: CoreMessage[] = [
    context.conversation.slice(-1)[0],
    {
      role: 'system',
      content: dedent`
        Return the ISO 639-1 language code of the user’s message, with no introductory or explanatory text`
    }
  ]

  // Prompt checked on january 24 2025
  const profanity: CoreMessage[] = [
    context.conversation.slice(-1)[0],
    {
      role: 'system',
      content: dedent`
        Determine whether user’s message contains offensive, inappropriate, or harmful language. Only return true or false, with no introductory or explanatory text.`
    }
  ]

  // Prompt checked on january 24 2025
  const user: CoreMessage[] = [
    ...context.conversation,
    {
      role: 'system',
      content: dedent`
        Summarize the user’s profile in French based on the conversation, including their name, marital status, children, residence type (e.g., T1, T2, T3), location (zipcode, department, region), housing status (owned/rented), and income if mentioned. Focus on housing-related details, preferences, or concerns. Output only the summary, with no introductory or explanatory text. If no relevant information is available, output 'null' with no introductory or explanatory text.`
    }
  ]

  // Prompt checked on january 24 2025
  const location: CoreMessage[] = [
    ...context.conversation,
    {
      role: 'system',
      content: dedent`
        Analyze the full conversation and always only infer user’s geographical location. If a region, department, or city is mentioned, output the corresponding geographical details. Follow the examples below. If no location is mentioned, output 'null'. Only output the location details or 'null', with no introductory or explanatory text.

        Examples:    
        * If user mentions "Bretagne" region, output: "region: Bretagne, departments: Côtes-d’Armor, Finistère, Ille-et-Vilaine, Morbihan"
        * If user mentions "Occitanie" region, output: "region: Occitanie, departments: Ariège, Aude, Aveyron, Gard, Haute-Garonne, Gers, Hérault, Lot, Lozère, Hautes-Pyrénées, Pyrénées-Orientales, Tarn, Tarn-et-Garonne"
        * If user mentions "Vaucluse" department, output: "region: Provence-Alpes-Côte d'Azur, departement: Vaucluse
        * If user mentions "Orange" city, output: "region: Provence-Alpes-Côte d'Azur, departement: Vaucluse, city: Orange, zipcode: 84100"
        * If user mentions no location, output : "null"`
    }
  ]

  // Prompt checked on january 24 2025
  const standalone_questions: CoreMessage[] = [
    ...context.conversation,
    {
      role: 'system',
      content: dedent`
        Analyze the conversation history and generate precise, standalone questions in French, separated by a pipe (|), aligned with the user’s final inquiries. Ensure each question is clear, self-contained, and detailed, incorporating locations, roles, departments, or dates (today is ${today_is()}) if relevant. If the intent is unclear, echo the user’s latest input verbatim. Output only the questions, formatted exactly as instructed, with no introductory or explanatory text.
        
        Examples:
        * "Qui est d'astreinte en ce moment ?" → "Qui est d'astreinte le ${today_is()} ?"
        * "Bonjour, je cherche un logement social à Nantes comment faire ?" → "Comment obtenir un logement social à Nantes (Loire-Atlantique)"
        * "Bonjour ! Qui es tu ? Et connais-tu des solution d'hébergement d'urgence à Piolenc pour violence conjugale ?" → "Qui es-tu ?" | "Quelles sont les solutions d'hébergement d'urgence pour les cas de violence conjugale à Piolenc (Vaucluse) ?"
        * "Bonjour ! C'est quoi un logement social, c'est quoi son histoire et combien y en a-t-il à Angers ?" → "Qu'est-ce qu'un logement social ?" | "Quelle est l'histoire du logement social ? | "Combien y a-t-il de logements sociaux à Angers (Maine-et-Loire) ?"
        * "Qui a les clés des portes anti squat ?" → "Qui est en possession des clefs des portes anti-squat ?"`
    }
  ]

  // Prompt checked on january 24 2025
  const search_queries: CoreMessage[] = [
    ...context.conversation,
    {
      role: 'system',
      content: dedent` 
        Carefully analyze the entire conversation and produce four well-crafted, contextually relevant web search queries in French, separated by a pipe (|), that effectively address the user’s final intent. Each query should be distinct in phrasing, capturing different dimensions of the inquiry to optimize search results. If a location is referenced, include the appropriate department in the query. Output only the queries, formatted exactly as instructed, with no introductory or explanatory text.`
    }
  ]

  // Prompt checked on january 24 2025
  const bm25_keywords: CoreMessage[] = [
    ...context.conversation,
    {
      role: 'system',
      content: dedent`
        Analyze the user’s final intent and generate a list of ten precise, high-impact keywords in French, separated by a pipe (|), optimized for a BM25-based search engine. Focus on essential terms and critical multi-word phrases while filtering out noise such as verbs, adjectives, adverbs, and generic words. Ensure all keywords are orthographically and grammatically correct, prioritizing exact matches for maximum retrieval relevance. Output only the keywords, formatted as instructed, with no additional text or explanation.`
    }
  ]

  // Prompt checked on january 24 2025
  const stepback_questions: CoreMessage[] = [
    ...context.conversation,
    {
      role: 'system',
      content: dedent`
        Review the entire conversation carefully and generate one to three thought-provoking, contextually appropriate step-back questions in French, separated by a pipe (|), designed to inspire deeper reflection or a broader perspective on the user’s final intent or standalone query. Ensure the questions are clear, meaningful, and directly tied to the context, without deviating from the original discussion. Output only the questions, formatted exactly as specified, with no introductory or explanatory text.`
    }
  ]

  // Prompt checked on january 24 2025
  const hyde_answers: CoreMessage[] = [
    ...context.conversation,
    {
      role: 'system',
      content: dedent`
        Analyze the entire conversation thoroughly and generate three precise, detailed, and contextually relevant responses in French, separated by a pipe (|), capturing all essential information likely to be present in the most authoritative search results addressing the user’s final query. Ensure the responses are comprehensive yet concise, preserving the original intent and meaning, and include any relevant geographic details (department and region) if a location is referenced. Present only the responses, formatted exactly as instructed, with no introductory or explanatory text.`
    }
  ]

  // Get LLM model to generate augmented queries
  const model = context.config.context[context.current_context].models.augment_with

  // Generate augmented queries using the specified model
  const results = await Promise.all([
    generate_text({ model: model, messages: lang }),
    generate_text({ model: model, messages: profanity }),
    generate_text({ model: model, messages: location }),
    generate_text({ model: model, messages: user }),
    generate_text({ model: model, messages: hyde_answers }),
    generate_text({ model: model, messages: stepback_questions }),
    generate_text({ model: model, messages: search_queries }),
    generate_text({ model: model, messages: bm25_keywords }),
    generate_text({ model: model, messages: standalone_questions })
  ])

  // Parse/validate the generated responses into an Augmented_Query object. Some
  // transformations are applied to the responses to ensure they are in the
  // correct format
  const augmented_query = Augmented_Query.parse({
    // Make sur `null` is parsed as `null` and not as a string
    about_user: results[3].toLowerCase().includes('null') ? null : results[3],
    location: results[2].toLowerCase().includes('null') ? null : results[2],

    // Convert the profanity check to a boolean
    contains_profanity: !!results[1]?.toLowerCase().includes('true'),

    // Convert a string with '|' delimiter to an array
    standalone_questions: convert_to_array(results[8]),
    stepback_questions: convert_to_array(results[5]),
    search_queries: convert_to_array(results[6]),
    bm25_keywords: convert_to_array(results[7]),
    hyde_answers: convert_to_array(results[4]),

    // prettier-ignore
    // Check if the language code is valid, otherwise default to 'fr'
    lang: [ 'ab','aa','af','ak','sq','am','ar','an','hy','as','av','ae','ay','az',
            'bm','ba','eu','be','bn','bh','bi','bs','br','bg','my','ca','ch','ce',
            'ny','zh','cv','kw','co','cr','hr','cs','da','dv','nl','dz','en','eo',
            'et','ee','fo','fj','fi','fr','ff','gl','ka','de','el','gn','gu','ht',
            'ha','he','hz','hi','ho','hu','ia','id','ga','ig','ik','io','is','it',
            'iu','ja','jv','kl','kn','kr','ks','kk','km','ki','rw','ky','kv','kg',
            'ko','ku','kj','la','lb','lg','li','ln','lo','lt','lu','lv','gv','mk',
            'mg','ms','ml','mt','mi','mr','mh','mn','na','nv','nd','ne','ng','nb',
            'nn','no','ii','nr','oc','oj','cu','om','or','os','pa','pi','fa','pl',
            'ps','pt','qu','rm','rn','ro','ru','sa','sc','sd','se','sm','sg','sr',
            'gd','sn','si','sk','sl','so','st','es','su','sw','ss','sv','ta','te',
            'tg','th','ti','bo','tk','tl','tn','to','tr','ts','tt','tw','ty','ug',
            'uk','ur','uz','ve','vi','vo','wa','cy','wo','fy','xh','yi','yo','za','zu']
            .includes(results[0].trim().toLowerCase()) ? results[0].trim().toLowerCase() : 'fr'
  })

  // End performance measurement
  performance.mark('end')
  console.debug(`
    -----------------------------------
    augment_query: ${performance.measure('d', 'start', 'end').duration}ms
    -----------------------------------
    `)

  console.log(augmented_query)

  return augmented_query
}
