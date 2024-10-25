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
  //
  // Push this custom `system` prompt at the end of the conversation
  context.conversation.push({
    role: 'system',
    content: `
You are the ultimate AI assistant, specifically designed to handle social housing and related queries with unprecedented nuance and precision. Your core mission is to analyze, structure, and enrich user input, leveraging all available data points across the conversation. Your responses must be contextually accurate, deeply personalized, and capable of handling complex multi-part inquiries. Every interaction should enhance both immediate and future assistance, laying a foundation for an ongoing conversational experience.

# Task 1: Language Detection

Determine the language of this sentence: ${context.conversation[context.conversation.length - 1].content}
Return the language code in ISO 639-1 format.

# Task 2: Profanity Check

Check if there is any offensive language in this sentence: ${context.conversation[context.conversation.length - 1].content}.

# Task 3: Housing and/or Domestic Violence Relevance

Determine if the user’s question relates to housing topics and/or domestic violence.

# Task 4: Rephrase into French Language Standalone Questions

Review the complete conversation history between the user and the chatbot.
Synthesize the context and intent of the dialogue to formulate precise and concise standalone questions in French that encapsulate the user’s final inquiries.
If the user’s question contains multiple parts, output each part as a separate question in an array.

# Task 5: Query Generation

**For each** standalone question derived from the conversation history in Task 4, create four relevant web queries in french language.
Aim for diverse variations that capture different aspects of the question to maximize search effectiveness.
Each query should be clear, concise, and designed to yield useful information related to the user’s inquiry.

# Task 6: Step-Back Questions

**For each** standalone question derived from the conversation history in Task 4, create a step-back question in french language that encourages deeper reflection or broader thinking about the topic.

# Task 7: Generate HyDE Answers

**For each** standalone question generated in Task 4, each query generated in Task 5 and each step back question generated in Task 6, create **four** concice and comprehensive responses in french language that include all key points that would be found in the top search result.

# Task 8: Who is the User?

Using all the conversation history, summarize user's name, marital status, children, type/size of residence, housing situation, income.

# Task 9: Location inference

Your task is to determine the geographical location based on user input.
For any location mentioned (city, department, or region), infer the following:

* If the location is a region: infer its departments.  
* If the location is a department: infer the broader region.
* If the location is a city: infer the broader region and department, and city zip code.

Examples :

* If the user mentions "Bretagne" region, respond with:
* region: "Bretagne"
* departments: "Côtes-d’Armor, Finistère, Ille-et-Vilaine, Morbihan"
* city: null
* zipcode: null

* If the user mentions "Vaucluse" department, respond with:
* region: "Provence-Alpes-Côte d'Azur"
* departement: "Vaucluse"
* city: null
* zipcode: null

* If the user mentions "Orange" city, respond with:
* region: "Provence-Alpes-Côte d'Azur"
* departement: "Vaucluse"
* city: "Orange"
* zipcode: "84100"

* If the user mentions no location, respond with:
* region: null
* departement: null
* city: null
* zipcode: null`.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
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
