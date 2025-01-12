import { createAnthropic } from '@ai-sdk/anthropic'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import _ from 'lodash'
import { z } from 'zod'
import { type AIContext, Augmented_Query } from './_schema'
import { today_is } from './generate-answer'

//
//
//
// Enhance user query
//

export const augment_query = async (context: AIContext) => {
  // Start performance measurement
  performance.mark('start')

  // Step 1.
  // Initialize the augmented query object

  const augmented_query = Augmented_Query.parse({
    lang: 'fr',
    about_user: 'No user details provided',
    contains_profanity: false,
    standalone_questions: [],
    bm25_keywords: [],
    hyde_answers: [],
    stepback_questions: [],
    search_queries: [],
    named_entities: { building: null, process: null },
    location: { region: null, department: [], city: [], zipcode: [] }
  })

  // Step 2.
  // Get standalone questions

  const question_is = {
    schema: z.object({ x: z.array(z.string()) }),
    messages: [
      ...context.conversation,
      {
        role: 'system',
        content: `Analyze the full conversation history and generate precise, standalone questions in French based on the user’s final inquiries. Adhere to these principles:
        1. Context Summary: Derive the purpose of the conversation to align questions with the user’s needs.
        2. Clarity: Ensure each question is self-explanatory and independent.
        3. Multi-Part Queries: Split complex questions into separate, concise elements in an array.
        4. Details: Include relevant locations, roles, departments, or dates (use today’s date: ${today_is()} if applicable).
        5. Fallback: If unclear or incomplete, echo the user’s latest input verbatim
        
        Examples:
        - "Qui est d'astreinte en ce moment ?" → ["Qui est d'astreinte le ${today_is()} ?"]
        - "Bonjour, je cherche un logement social à Nantes comment faire ?" → ["Comment obtenir un logement social à Nantes (Loire-Atlantique)"]
        - "Bonjour ! Qui es tu ? Et connais-tu des solution d'hébergement d'urgence à Piolenc pour violence conjugale ?" → ["Qui es-tu ?", "Quelles sont les solutions d'hébergement d'urgence pour les cas de violence conjugale à Piolenc (Vaucluse) ?"]
        - "Bonjour ! C'est quoi un logement social, c'est quoi son histoire et combien y en a-t-il à Angers ?" → ["Qu'est-ce qu'un logement social ?", "Quelle est l'histoire du logement social ?, "Combien y a-t-il de logements sociaux à Angers (Maine-et-Loire) ?"]
        - "Qui a les clés des portes anti squat ?" → ["Qui est en possession des clefs des portes anti-squat ?"]`
      }
    ]
  }

  // TODO: add a default value for the standalone questions
  // Add the standalone questions to the augmented query object
  augmented_query.standalone_questions = (
    (await generate_obj(question_is, context)) as { x: string[] }
  ).x

  performance.mark('batch_1_end')

  // Step 3.
  // Fetch the rest of the data

  const lang_is = {
    schema: z.object({ x: z.string().describe('Language code in ISO 639-1 format') }),
    messages: [
      context.conversation.slice(-1)[0],
      {
        role: 'system',
        content: 'Return the language code in ISO 639-1 format of user message.'
      }
    ]
  }

  const contains_profanity = {
    schema: z.object({ x: z.boolean().describe('Is any offensive language in user message?') }),
    messages: [
      context.conversation.slice(-1)[0],
      {
        role: 'system',
        content:
          'Return true if there is any offensive language in user message. Otherwise return false'
      }
    ]
  }

  const user_is = {
    schema: z.object({ x: z.string().describe('User profile summary in French') }),
    messages: [
      ...context.conversation,
      {
        role: 'system',
        content:
          'Summarize **in French** the user’s profile based on the conversation, including their name, marital status, children, residence type (e.g., T1, T2, T3), location (zipcode, department, region), housing status (owned/rented), and income details if available. Also, highlight key housing-related information, preferences, concerns, or insights mentioned.'
      }
    ]
  }

  const location_is = {
    schema: z.object({
      r: z.string().nullable().describe('Region name'),
      d: z.array(z.string()).nullable().describe('Departement involved'),
      c: z.array(z.string()).nullable().describe('Cities involved'),
      z: z.array(z.string()).nullable().describe('Zip codes')
    }),
    messages: [
      ...context.conversation,
      {
        role: 'system',
        content: `Infer the geographical location from user input. For regions, identify their departments; for departments, determine their region; for cities, provide the region, department, and zip code.
        
        Examples:
      
        * If the user mentions "Bretagne" region, output:
        - region: "Bretagne"
        - departments: "Côtes-d’Armor, Finistère, Ille-et-Vilaine, Morbihan"
        - city: null
        - zipcode: null
        
        * If the user mentions "Occitanie" region, output:
        - region: "Occitanie"
        - departments: "Ariège, Aude, Aveyron, Gard, Haute-Garonne, Gers, Hérault, Lot, Lozère, Hautes-Pyrénées, Pyrénées-Orientales, Tarn, Tarn-et-Garonne"
        - city: null
        - zipcode: null
        
        * If the user mentions "Vaucluse" department, output:
        - region: "Provence-Alpes-Côte d'Azur"
        - departement: "Vaucluse"
        - city: null
        - zipcode: null
        
        * If the user mentions "Orange" city, output:
        - region: "Provence-Alpes-Côte d'Azur"
        - departement: "Vaucluse"
        - city: "Orange"
        - zipcode: "84100"
        
        * If the user mentions no location, output:
        - region: null
        - departement: null
        - city: null
        - zipcode: null`
      }
    ]
  }

  const named_entities_are = {
    schema: z.object({
      b: z.string().nullable().describe('Building'),
      p: z.string().nullable().describe('Process')
    }),
    messages: [
      ...context.conversation,
      {
        role: 'system',
        content: `# Task 1: Extract Building/Entity Names
        
        Identify any specific building or named entity (e.g., residence, house, school, or building) mentioned in the text. Extract and present its name in a simplified and concise form. Examples:
        
        - "Résidence Les Pléiades" → "Les Pléiades"
        - "Immeuble York" → "York"
        - "Villa Medicis" → "Medicis
        - "Ecole Gambetta" → "Gambetta"
        - "Foyer Zola" → "Zola"
        - "Ilot Corse" → "Ilot Corse"
        - "Batîment Jules Renard" → "Jules Renard"
        - "Programme Voltaire" → "Voltaire"
        
        # Task 2: Extract Events/Issues
        
        Identify and summarize in French any described events, issues, or processes, such as problems, maintenance requests, or other notable occurrences (e.g., “lack of electricity,” “maintenance needed,” or “specific problem identified”).`
      }
    ]
  }

  const batch_2 = augmented_query.standalone_questions.flatMap((q: string) => {
    const search_queries = {
      schema: z.object({ q: z.array(z.string()).describe('Search queries in French') }),
      messages: [
        {
          role: 'user',
          content: `Considering this question: "${q}". Create four relevant web queries in french language. Aim for diverse variations that capture different aspects of the question to maximize search effectiveness. Each query should be clear, concise, and designed to yield useful information related to the user’s inquiry. If a location is mentioned, add the relevant department to the query while maintaining the original meaning.
            Examples:
            - "Quelle est l'histoire des HLM à Saint-Nazaire" → ["histoire des HLM à Saint-Nazaire (Loire-Atlantique)"]
            - "Combien y a-t-il de logemnents sociaux à Orange" → ["nombre de logements sociaux à Orange (Vaucluse)"]`
        }
      ]
    }

    const bm25_keywords = {
      schema: z.object({ b: z.array(z.string()).describe('BM25 keywords in French') }),
      messages: [
        {
          role: 'user',
          content: `Considering this question: "${q}". Generate an array of keywords designed to optimize relevance and precision in a BM25-based search engine. Prioritize crafting keywords that are essential for ensuring the returned records effectively address user queries. Ensure all keywords and phrases are orthographically and grammatically correct to maximize precision and coherence. Use the following strategies:
            1. **Keyword Extraction and Prioritization**
            Extract the most relevant keywords emphasizing:
            - High-impact terms directly related to the search intent.
            - Rare or domain-specific terms that can enhance retrieval precision.
            2. **Noise Filtering**
            Exclude ALL terms that may introduce noise into the search:
            - Verbs, adjectives, adverbs, connectives.
            - Irrelevant or overly generic terms.
            3. **Multi-Word Phrases and Collocations**
            Identify and include critical multi-word phrases, idiomatic expressions, and collocations directly relevant to the query (max. 2 words). Since BM25 excels with exact matches, focus on selecting phrases that encapsulate essential concepts concisely, accurately and orthographically/grammatically correct.`
        }
      ]
    }

    const stepback_questions = {
      schema: z.object({ s: z.array(z.string()).describe('Step-back questions in French') }),
      messages: [
        {
          role: 'user',
          content: `Considering this question: "${q}". Create a step-back question in french language that encourages deeper reflection or broader thinking about the topic.`
        }
      ]
    }

    const hyde_answers = {
      schema: z.object({ h: z.array(z.string()).describe('HyDE answers in French') }),
      messages: [
        {
          role: 'user',
          content: `Considering this question: "${q}".  Create four concice and comprehensive responses in french language that include all key points that would be found in the top search result. If a location is mentioned, add the relevant department to the response while maintaining the original meaning.
            Examples:
            - For input: "Comment obtenir un logement social à Carpentras", output: ["Pour obtenir un logement social à Carpentras Vaucluse, vous devez faire une demande auprès de la mairie ou d'un organisme de logement social. Vous aurez besoin de fournir des documents comme vos revenus et votre situation familiale."]`
        }
      ]
    }

    return [
      generate_obj(hyde_answers, context),
      generate_obj(stepback_questions, context),
      generate_obj(search_queries, context),
      generate_obj(bm25_keywords, context)
    ]
  })

  const batch_2_results = await Promise.all([
    generate_obj(lang_is, context),
    generate_obj(contains_profanity, context),
    generate_obj(named_entities_are, context),
    generate_obj(location_is, context),
    generate_obj(user_is, context),
    ...batch_2
  ])

  augmented_query.lang = (batch_2_results[0] as { x: string }).x
  augmented_query.contains_profanity = (batch_2_results[1] as { x: boolean }).x
  augmented_query.about_user = (batch_2_results[4] as { x: string }).x
  augmented_query.named_entities.building = (batch_2_results[2] as { b: string | null }).b
  augmented_query.named_entities.process = (batch_2_results[2] as { p: string | null }).p
  augmented_query.location.region = (batch_2_results[3] as { r: string | null }).r
  augmented_query.location.department = (batch_2_results[3] as { d: string[] | null }).d
  augmented_query.location.city = (batch_2_results[3] as { c: string[] | null }).c
  augmented_query.location.zipcode = (batch_2_results[3] as { z: string[] | null }).z

  const results = _(batch_2_results)
    .flatMap((item) =>
      _.toPairs(item as object)
        .map(([key, value]) => ({
          key:
            {
              q: 'search_queries',
              b: 'bm25_keywords',
              s: 'stepback_questions',
              h: 'hyde_answers'
            }[key] || key,
          value
        }))
        .filter(({ value }) => !_.isNil(value) && value !== '' && !_.isEmpty(value))
    )
    .groupBy('key')
    .mapValues((items) => _.flatMap(items, 'value'))
    .value()

  augmented_query.bm25_keywords = results.bm25_keywords
  augmented_query.hyde_answers = results.hyde_answers
  augmented_query.stepback_questions = results.stepback_questions
  augmented_query.search_queries = results.search_queries

  performance.mark('batch_2_end')

  console.log('Augmentation Query Performance:')
  console.table([
    ['Batch 1', `${performance.measure('qa', 'start', 'batch_1_end').duration}ms`],
    ['Batch 2', `${performance.measure('qa', 'batch_1_end', 'batch_2_end').duration}ms`],
    ['Total  ', `${performance.measure('qa', 'start', 'batch_2_end').duration}ms`]
  ])

  console.log(augmented_query)
  return Augmented_Query.parse(augmented_query)
}

//
//
//
//
//
//
//
//
// Generate a JSON object and return it
const generate_obj = async (prompt, context: AIContext) => {
  const openai = createOpenAI({ compatibility: 'strict' })
  const google = createGoogleGenerativeAI()
  const anthropic = createAnthropic()
  const mistral = createMistral()
  const cohere = createCohere()

  try {
    // Generate a JSON object and return it
    const { object } = await generateObject({
      // biome-ignore lint: server-side eval to keep `config.ts` simple
      model: eval(context.config.context[context.current_context].models.augment_with),
      messages: prompt.messages,
      schema: prompt.schema,
      temperature: 0
    })
    return object
  } catch (error) {
    console.error(error)
    throw error
  }
}
