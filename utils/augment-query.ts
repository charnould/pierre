import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { type AIContext, Augmented_Query } from './_schema'

const openai = createOpenAI({ compatibility: 'strict' })

//
//
//
// Enhance user query
//

export const augment_query = async (context: AIContext) => {
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


# Task 4: Rephrase into French Language Questions

Examine the entire conversation history. Summarize the context and purpose of the dialogue to generate clear, standalone questions in French that accurately capture the user’s final inquiries. For multi-part inquiries, create each question as an individual element within an array. If a location is mentioned, include the relevant department in the question while maintaining the original meaning. If a date is mentioned, add it to the question while preserving the original meaning (today is: The current date and time is ${new Date().toLocaleString('fr-FR')}). Additionally, ensure that inquiries related to specific roles, responsibilities, or operational details (e.g., personnel availability or access to resources) are rephrased as standalone questions.

If you cannot generate standalone question, reformulate cleary what user just said.

If the conversation seems to requires specific, current, running or ongoing information and not present in the conversation, still rephrase.
If you cannot ouput a standalone questions. Explain why.

Examples:

- For input: "bonjour, je cherche un logement social à Nantes comment faire ?", output: ["Comment obtenir un logement social à Nantes (Loire-Atlantique)"]
- For input: "bonjour ! Qui es tu ? Et connais-tu des solution d'hébergement d'urgence à Piolenc pour violence conjugale ?", output: ["Qui es-tu ?", "Quelles sont les solutions d'hébergement d'urgence pour les cas de violence conjugale à Piolenc (Vaucluse) ?"]
- For input: "bonjour ! C'est quoi un logement social, c'est quoi son histoire et combien y en a-t-il à Angers ?", output: ["Qu'est ce qu'un logement social", "Quelle est l'histoire du logemetn social ?, "Combien y a-t-il de logements sociaux à Angers (Maine-et-Loire) ?"]
- For input: "qui est d'astreinte aujourd'hui?", output: ["qui est d'astreinte aujourd'hui?"]
- For input: "qui a les clés des portes anti squat ?", output: ["Qui est en possession des clefs des portes anti-squat ?"]


# Task 5: Search Query Generation

**For each** standalone question derived from the conversation history in Task 4, create five relevant web queries in french language. Aim for diverse variations that capture different aspects of the question to maximize search effectiveness. Each query should be clear, concise, and designed to yield useful information related to the user’s inquiry. If a location is mentioned, add the relevant department to the query while maintaining the original meaning.

Examples:

- For input: "Quelle est l'histoire des HLM à Saint-Nazaire", output: ["histoire des HLM à Saint-Nazaire (Loire-Atlantique)"]
- For input: "Combien y a-t-il de logemnents sociaux à Orange", output: ["nombre de logements sociaux à Orange (Vaucluse)"]


Task 6: Optimized BM25 Keywords Query Generation

Building on the results from Task 4, create an array of up to 10 keywords to maximize relevance and precision in a BM25-based search engine. Focus on crafting keywords that align with the following strategies:

1. **Keyword Extraction and Prioritization**
Extract the most relevant keywords from the provided context, emphasizing:
- High-impact terms directly related to the search intent.
- Rare or domain-specific terms that can enhance retrieval precision.

2. **Synonym and Related Term Expansion**
For each extracted keyword, generate synonyms and semantically related terms to broaden the search scope. Ensure these expansions remain contextually appropriate, e.g., within the domain of social housing.

3. **Multi-Word Phrases and Collocations**
Identify and incorporate important multi-word phrases, idiomatic expressions, or collocations relevant to the query. BM25 performs well with exact matches, so prioritize phrases that capture key concepts succinctly.

4. **Contextual Relevance and Noise Filtering**
Exclude irrelevant or overly generic terms that may introduce noise into the search results. Highlight only those keywords with strong contextual alignment to the intended query.


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
  `.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
  })

  // Generate a JSON object and return it
  const { object } = await generateObject({
    model: openai('gpt-4o-mini-2024-07-18', { structuredOutputs: true }),
    messages: context.conversation,
    schema: Augmented_Query, // See `_schema.ts`
    temperature: 0.5
  })

  // Remove last `system` prompt to avoid polluting conversation history
  context.conversation.pop()

  return object
}
