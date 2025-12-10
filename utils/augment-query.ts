import dedent from 'dedent'
import { type AIContext, Augmented_Query } from './_schema'
import { convert_to_array } from './convert-to-array'
import { today_is } from './generate-answer'
import { generate_text } from './generate-output'
import { ModelMessage } from 'ai'

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
export const augment_query = async (context: AIContext): Promise<Augmented_Query> => {
  // Start performance measurement
  performance.mark('start')

  // Multiple prompts used to generate augmented queries. The goal is to enhance
  // query variety and capture different aspects of the user's intent.

  // Prompt checked on february 2 2025
  const lang_and_profanity: ModelMessage[] = [
    {
      role: 'user',
      content: dedent`
      Analyze the given sentence and return two results:  
        1. **Profanity Check** – Determine whether the text contains any actual profanity, swear words, slurs, vulgar expressions, or intentionally offensive/inappropriate language. Do not flag neutral, descriptive, or colloquial phrases unless they are widely recognized as offensive in the given language/culture. Return 'true' only if clear profanity is present; otherwise, return 'false'.  
        2. **Language Detection** – Identify the primary language of the sentence and return its ISO 639-1 two-letter code. If multiple languages are present, return the code of the dominant language.  
                
        **Think carefully and output profanity check first, within <profanity> tags, then language detection, within <lang> tags, followed by your reasoning.**
        
        Sentence: “${context.conversation.slice(-1)[0].content}”`
    }
  ]

  // Prompt checked on february 2 2025
  const standalone_questions: ModelMessage[] = [
    ...context.conversation,
    {
      role: 'assistant',
      content: dedent`Analyze the conversation history and generate a set of standalone questions in French, each rephrasing the user's last inquiry. Each question must be clear, self-contained, faithful to the user’s intent, concise, and must not introduce new information.${context.config.knowledge.location && ` Whenever the inquiry relates to a place, region, or geographic context, explicitly include the user’s location ("${context.config.knowledge.location}").`} If multiple questions are required, separate them with a pipe (|). If a question refers to “aujourd’hui” or another relative time expression (e.g., « qui est d’astreinte aujourd’hui »), replace it with today’s actual date: ${today_is()}. Output only the final standalone question(s), without introductions, explanations, comments, or formatting.`
    }
  ]

  // Prompt checked on february 2 2025
  const search_queries: ModelMessage[] = [
    ...context.conversation,
    {
      role: 'system',
      content: dedent`
      Analyze the entire conversation thoroughly and generate the following:
        
        1. **Hypothetical Document Embeddings** - Two brief and contextually relevant responses in French capturing all essential information likely to be present in the most authoritative search results addressing the user’s final query. Ensure they are comprehensive yet concise, preserving the original intent and meaning, and include relevant geographic details if a location is mentioned. Provide only the reponses, without any introductory phrases, additional explanations or quotes but separated by a pipe (|).
        
        2. **Stepback Questions** - Two thought-provoking step-back questions in French designed to inspire deeper reflection or a broader perspective on the user’s final intent. Ensure the questions are meaningful, directly tied to the context, and relevant to the discussion. Provide only the questions, without any introductory phrases, additional explanations or quotes but separated by a pipe (|).
        
        3. **Web Search Queries** - Two distinct web search queries in French that directly address the user’s final intent. Each query should cover a different aspect of the inquiry to maximize the variety of relevant search results. Provide only the queries, without any introductory phrases, additional explanations or quotes but separated by a pipe (|).
        
        Output Rules:
        - Output MUST be a **single line**.  
        - Output MUST contain **exactly six segments** (two responses + two questions + two queries).  
        - Each segment MUST be separated by '|'.  
        - Do NOT include titles, explanations, quotes, lists, bullet points, markdown, or any formatting.  
        - Do NOT include introductory text.
        - If a question mentions a specific date or time (e.g., 'qui est d’astreinte aujourd’hui'), use today’s date: ${today_is}.
        - If the inquiry references a location, include the appropriate region, department, city, or zipcode.${context.config.knowledge.location && ` If it does not reference any location but involves a geographic context, explicitly add the user’s location ("${context.config.knowledge.location}").`}
        
        Final output format example (illustrative only):
        Lorem ipsum | lorem ipsum | lorem ipsum | lorem ipsum | lorem ipsum | lorem ipsum
        `
    }
  ]

  // Prompt checked on february 2 2025
  const bm25_keywords: ModelMessage[] = [
    ...context.conversation,
    {
      role: 'assistant',
      content: dedent`Analyze the user’s final intent and generate a list of five precise, high-impact keywords in French, separated by a pipe (|), optimized for a BM25-based search engine. Focus on essential terms and critical multi-word phrases while filtering out noise such as verbs, adjectives, adverbs, and generic words. Ensure all keywords are orthographically and grammatically correct, prioritizing exact matches for maximum retrieval relevance. If the user’s inquiry involves a place or geographic context, include relevant location terms.${context.config.knowledge.location && ` If no location is mentioned but the inquiry is geographic, explicitly add the user’s location ("${context.config.knowledge.location}").`} Output only the keywords, formatted as instructed, with no additional text or explanation.`
    }
  ]

  // Generate augmented queries using the specified model
  const results = await Promise.all([
    generate_text({
      model: context.config.models.augment_with,
      messages: standalone_questions,
      max_tokens: 100
    }),
    generate_text({
      model: context.config.models.augment_with,
      messages: lang_and_profanity,
      max_tokens: 100
    }),
    generate_text({
      model: context.config.models.augment_with,
      messages: search_queries,
      max_tokens: 350
    }),
    generate_text({
      model: context.config.models.augment_with,
      messages: bm25_keywords,
      max_tokens: 200
    })
  ])

  // Parse/validate the generated responses into an Augmented_Query object. Some
  // transformations are applied to the responses to ensure they are in the
  // correct format
  const profanity = extract_tag_value(results[1], 'profanity', false)
  const language = extract_tag_value(results[1], 'lang', 'fr')

  const augmented_query = Augmented_Query.parse({
    // Convert a string with '|' delimiter to an array
    standalone_questions: convert_to_array(results[0]),
    search_queries: convert_to_array(results[2]),
    bm25_keywords: convert_to_array(results[3]),

    // Convert the profanity check to a boolean
    contains_profanity: typeof profanity === 'string' ? !!profanity.includes('true') : false,

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
            'uk','ur','uz','ve','vi','vo','wa','cy','wo','fy','xh','yi','yo','za','zu'].includes(typeof language === "string" ? language : "")
			? language
			: "fr"
  })

  // End performance measurement
  performance.mark('end')
  console.log(augmented_query)

  return augmented_query
}

/**
 * Extracts the value of a specified tag from a given response string.
 *
 * @note This function is tested in tests/unit/utils/extract-tag-value.test.ts
 * @param response - The string containing the HTML/XML response.
 * @param tag - The tag whose value needs to be extracted.
 * @param fallback - The fallback value to return if the tag is not found.
 * @returns The extracted tag value in lowercase and trimmed, or the fallback value if the tag is not found.
 */
export const extract_tag_value = (
  response: string,
  tag: string,
  fallback: number | string | boolean | null
) => {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`)
  const match = response.match(regex)
  return match ? match[1].trim().toLowerCase() : fallback
}
