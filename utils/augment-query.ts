import { createAnthropic } from '@ai-sdk/anthropic'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { type AIContext, Augmented_Query } from './_schema'
import { today_is } from './generate-answer'

//
//
//
// Enhance user query
//

export const augment_query = async (context: AIContext) => {
  // TODO: remove Task 3 (not needed anymore - to confirm)
  // Push this custom `system` prompt at the end of the conversation.
  // It will be removed from the conversation at the end of this
  // function to keep conversation history clean.
  context.conversation.push({
    role: 'system',
    content: `

You are the ultimate AI assistant. Your core mission is to analyze, structure, and enrich user input, leveraging all available data points across the conversation. Your responses must be contextually accurate, deeply personalized, and capable of handling complex multi-part inquiries. Every interaction should enhance both immediate and future assistance, laying a foundation for an ongoing conversational experience. 

# Task 1: Language Detection

Determine the language of this sentence: ${context.conversation[context.conversation.length - 1].content}. Return the language code in ISO 639-1 format.


# Task 2: Profanity Check

Check if there is any offensive language in this sentence: ${context.conversation[context.conversation.length - 1].content}.


# Task 3: Housing and/or Domestic Violence Relevance

Determine if the user’s question relates to housing topics and/or domestic violence.


# Task 4: Rephrase as Standalone French Questions

Analyze the complete conversation history to generate clear and independent questions in French that reflect the user’s final inquiries. Follow these guidelines to ensure precision and relevance:

1. **Summarize the Context**: Understand the dialogue’s purpose and context to craft questions that align with the user’s needs.
2. **Clarity and Structure**: Each question must stand alone and provide enough detail to be understood independently.
3. **Multi-Part Inquiries**: Break down complex inquiries into individual questions, each as a separate element in an array.
4. **Contextual Details**: Incorporate any referenced locations or departments into the question, ensuring the phrasing remains accurate.
5. **Dates and Times**: If the inquiry involves a date, explicitly include it in the rephrased question (today’s date is: ${today_is()}).
6. **Roles and Responsibilities**: For queries about specific roles, operational details, or resource access, ensure they are phrased clearly and unambiguously.

**Fallback Rule**:
-	If the conversation lacks a clear inquiry or requires real-time, external, or incomplete information, simply restate the user’s most recent input verbatim (e.g., if the user says “Hi” output “Good morning”).

Examples:

- "Qui est d'astreinte en ce moment ?" → ["Qui est d'astreinte le ${today_is()} ?"]
- "Bonjour, je cherche un logement social à Nantes comment faire ?" → ["Comment obtenir un logement social à Nantes (Loire-Atlantique)"]
- "Bonjour ! Qui es tu ? Et connais-tu des solution d'hébergement d'urgence à Piolenc pour violence conjugale ?" → ["Qui es-tu ?", "Quelles sont les solutions d'hébergement d'urgence pour les cas de violence conjugale à Piolenc (Vaucluse) ?"]
- "Bonjour ! C'est quoi un logement social, c'est quoi son histoire et combien y en a-t-il à Angers ?" → ["Qu'est-ce qu'un logement social ?", "Quelle est l'histoire du logement social ?, "Combien y a-t-il de logements sociaux à Angers (Maine-et-Loire) ?"]
- "Qui a les clés des portes anti squat ?" → ["Qui est en possession des clefs des portes anti-squat ?"]

If you cannot ouput a standalone questions. Explain why.

# Task 5: Search Query Generation

**For each** standalone question derived from the conversation history in Task 4, create five relevant web queries in french language. Aim for diverse variations that capture different aspects of the question to maximize search effectiveness. Each query should be clear, concise, and designed to yield useful information related to the user’s inquiry. If a location is mentioned, add the relevant department to the query while maintaining the original meaning.

Examples:

- "Quelle est l'histoire des HLM à Saint-Nazaire" → ["histoire des HLM à Saint-Nazaire (Loire-Atlantique)"]
- "Combien y a-t-il de logemnents sociaux à Orange" → ["nombre de logements sociaux à Orange (Vaucluse)"]


Task 6: Optimized BM25 Keywords Query Generation

Using the outcomes of Task 4, generate an array of keywords designed to optimize relevance and precision in a BM25-based search engine. Prioritize crafting keywords that are essential for ensuring the returned records effectively address user queries. Ensure all keywords and phrases are orthographically and grammatically correct to maximize precision and coherence. Use the following strategies:

1. **Keyword Extraction and Prioritization**
Extract the most relevant keywords emphasizing:
- High-impact terms directly related to the search intent.
- Rare or domain-specific terms that can enhance retrieval precision.

2. **Noise Filtering**
Exclude ALL terms that may introduce noise into the search:
- Verbs, adjectives, adverbs, connectives.
- Irrelevant or overly generic terms.

3. **Multi-Word Phrases and Collocations**
Identify and include critical multi-word phrases, idiomatic expressions, and collocations directly relevant to the query (max. 2 words). Since BM25 excels with exact matches, focus on selecting phrases that encapsulate essential concepts concisely, accurately and orthographically/grammatically correct.


# Task 6: Step-Back Questions

**For each** standalone question derived from the conversation history in Task 4, create a step-back question in french language that encourages deeper reflection or broader thinking about the topic.


# Task 7: Generate HyDE Answers

**For each** standalone question generated in Task 4, each query generated in Task 5 and each step back question generated in Task 6, create five concice and comprehensive responses in french language that include all key points that would be found in the top search result. If a location is mentioned, add the relevant department to the response while maintaining the original meaning.

Examples:

- For input: "Comment obtenir un logement social à Carpentras", output: ["Pour obtenir un logement social à Carpentras Vaucluse, vous devez faire une demande auprès de la mairie ou d'un organisme de logement social. Vous aurez besoin de fournir des documents comme vos revenus et votre situation familiale."]


# Task 8: Who is the User?

Using all the conversation history, generate a detailed profile summary of the user, capturing its name, marital status, number of children, type of residence (e.g., T1, T2, T3), location (infer zipcode, department and region), housing status (owned, rented, etc.), and income details. In addition, provide a comprehensive overview of all housing-related information gathered throughout the conversation history, highlighting any specific preferences, concerns, or insights relevant to their residential situation.


# Task 9: Location inference

Your task is to determine the geographical location based on user input.
For any location mentioned (city, department, or region), infer the following:

* If the location is a region: infer its departments.  
* If the location is a department: infer the broader region.
* If the location is a city: infer the broader region and department, and city zip code.

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
  - zipcode: null


# Task 10: Named Entity Recognition

For each standalone question derived from the conversation history in Task 4, perform the following:
1. **Building**: Identify any specific building or named entity mentioned (e.g., residence, house, or building). Extract its name in a concise form. For example:
  - "Résidence Les Pléiades" → "Les Pléiades"
  - "Immeuble York" → "York"
  - "Villa Medicis" → "Medicis
  - "Ecole Gambetta" → "Gambetta"
  - "Foyer Zola" → "Zola"
  - "Ilot Corse" → "Ilot Corse"
  - "Batîment Jules Renard" → "Jules Renard"
  - "Programme Voltaire" → "Voltaire"
2. **Process/Issue**: Identify and extract any described events, issues, or processes (e.g., a lack of electricity, a maintenance request, or a specific problem).

`.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
  })

  const openai = createOpenAI({ compatibility: 'strict' })
  const google = createGoogleGenerativeAI()
  const anthropic = createAnthropic()
  const mistral = createMistral()
  const cohere = createCohere()

  // Generate a JSON object and return it
  const { object } = await generateObject({
    // biome-ignore lint: server-side eval to keep `config.ts` simple
    model: eval(context.config.context[context.current_context].models.augment_with),
    messages: context.conversation,
    schema: Augmented_Query, // See `_schema.ts`
    temperature: 0.5
  })

  // Remove last `system` prompt to avoid polluting conversation history
  context.conversation.pop()

  return object
}
