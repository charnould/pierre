import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { AIContext } from './_schema'

const openai = createOpenAI({ compatibility: 'strict' })

//
//
//
//
// Enhance user query
//
//
//
//

export const enhance_query = async (context: AIContext) => {
  //
  let txt_conversation = ''
  for (const c of context.conversation) {
    const role = c.role.toUpperCase()
    txt_conversation += `<${role}>${c.content}</${role}>\n`
  }

  // TODO: faire le lien avec le schéma correspondant
  // il y a des doublons (c'est pas DRY !)
  const { object } = await generateObject({
    model: openai('gpt-4o-mini-2024-07-18', { structuredOutputs: true }),
    temperature: 0.5,
    // prettier-ignore
    // biome-ignore format: readability
    schema: z.object({
      contains_profanity  : z.boolean().describe('Whether the input contains profanity'),
      contains_greeting   : z.boolean().describe('Whether the input is a greeting'),
      is_about_yourself   : z.boolean().describe('Whether the input is about the assistant'),
      is_relevant         : z.boolean().describe('Whether the input relates to housing or domestic violence'),
      about_user          : z.string().describe('Key user details'),
      lang                : z.string().describe('User language (ISO 639-1)'),
      standalone_question : z.array(z.string()).describe('Standalone user questions'),
      translated_followup : z.string().describe('Original user follow-up, or follow-up translated into French if needed'),
      search_queries      : z.array(z.string()).describe('Optimized web search queries'),
      stepback_questions  : z.array(z.string()).describe('Step back questions'),
      hyde_answers        : z.array(z.string()).describe('Hypothetical document embeddings'),
      location  : z.object({
        region      : z.string().nullable().describe('Region name'),
        department  : z.array(z.string()).nullable().describe('Departement involved'),
        city        : z.array(z.string()).nullable().describe('Cities involved'),
        zipcode     : z.array(z.string()).nullable().describe('Zip codes')
    }).describe('Geographic location'),
    }),
    messages: [ { 
      role: 'system',
      content: `
# CONVERSATION

${txt_conversation}

# INSTRUCTIONS

You are the ultimate AI assistant, specifically designed to handle social housing and related queries with unprecedented nuance and precision. Your core mission is to analyze, structure, and enrich user input, leveraging all available data points across the conversation. Your responses must be contextually accurate, deeply personalized, and capable of handling complex multi-part inquiries. Every interaction should enhance both immediate and future assistance, laying a foundation for an ongoing conversational experience.

## Task 7: Rephrase into Standalone Questions

Review the complete conversation history between the user and the chatbot. Synthesize the context and intent of the dialogue to formulate precise and concise standalone questions in French that encapsulate the user’s final inquiries. If the user’s question contains multiple parts, output each part as a separate question in an array.
If required, translate the follow-up into French.


## Task 1: Language Detection

Considering conversation above, determine the last language used by the user.
Return the language code in ISO 639-1 format.


## Task 2: Profanity Check

Check if there is **any** offensive language in the last message.


## Task 3:. Greeting Detection

Determine if the last input is a greeting or signals the end of the discussion.


## Task 4: Self-Reference Detection

Check if the user’s question is about the assistant (such as its identity, creator, etc.).


## Task 5: Who is the User?

Using all the conversation history, summarize key details (excluding location) about the user that could help provide personalized responses. Include relevant information such as name, marital status, children, type/size of residence, housing situation, income, and other pertinent factors.


## Task 6: Housing and/or Domestic Violence Relevance

Determine if the user’s question relates to housing topics and/or domestic violence.


## Task 9: Query Generation

**For each** standalone question derived from the conversation history in step 7, create four relevant web queries in french language. Aim for diverse variations that capture different aspects of the question to maximize search effectiveness. Each query should be clear, concise, and designed to yield useful information related to the user’s inquiry.


## Task 10: Step-Back Question

For each standalone question derived from the conversation history, create a step-back question in french language that encourages deeper reflection or broader thinking about the topic.


## Task 11: Generate HyDE answers

For each standalone question generated in Task 7, each query generated in Task 9 and each step back question generated in Task 10, create **four** concice and comprehensive responses in french language that include all key points that would be found in the top search result.


## Task 12: Location inference

Your task is to determine the geographical location based on user input. For any location mentioned (city, department, or region), infer the following:

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
  * zipcode: null
  
`.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
      }
    ]
  })

  return object
}
