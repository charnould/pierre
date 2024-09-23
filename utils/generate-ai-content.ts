import { createAnthropic } from '@ai-sdk/anthropic'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject, streamText } from 'ai'
import { z } from 'zod'
import type { AIContext } from './_schema'
import { save_reply } from './handle-conversation'

const anthropic = createAnthropic({ apiKey: Bun.env.ANTHROPIC_API_KEY })
const cohere = createCohere({ apiKey: Bun.env.COHERE_API_KEY })
const google = createGoogleGenerativeAI({ apiKey: Bun.env.GOOGLE_API_KEY })
const mistral = createMistral({ apiKey: Bun.env.MISTRAL_API_KEY })
const openai = createOpenAI({ apiKey: Bun.env.OPENAI_API_KEY, compatibility: 'strict' })

//
//
//
//
//
//
//
//
// ENHANCE_QUERY
//
// Cette fonction transforme une "simple" requête de l'utilisateur
// en un "objet augmenté" permettant de comprendre ses intentions et
// d'optimiser la recherche des connaissances/informations pertinentes.
//
export const enhance_query = async (context: AIContext) => {
  //
  //
  let textified_conversation = ''
  for (const c of context.conversation) {
    const role = c.role.toUpperCase()
    textified_conversation += `<${role}>${c.content}</${role}>\n`
  }

  //
  const { object } = await generateObject({
    model: openai('gpt-4o-mini-2024-07-18'),
    temperature: 0.5,
    // prettier-ignore
    // biome-ignore format: readability
    schema: z.object({
      lang                : z.string().describe('User language (in english)'),
      contains_profanity  : z.boolean().describe('Does user last input contains profanity?'),
      is_greeting         : z.boolean().describe('Does user last input is a greeting?'),
      is_about_yourself   : z.boolean().describe('Does user question is about yourself?'),
      is_about_housing    : z.boolean().describe('Is translated follow up about housing?'),
      original_followup   : z.string().describe('User follow up'),
      translated_followup : z.string().describe('User follow up in french language'),
      queries             : z.array(z.string()).describe('Best search queries for web search engine'),
      stepback            : z.string().describe('A more generic question'),
      hyde                : z.array(z.string()).describe('Three short sentences answering queries and stepback'),
    }),
    mode: 'json',
    messages: [
      {
        role: 'system',
        content: `
          ### CONVERSATION ###
          
          ${textified_conversation}
          
          ### CONTEXT ###

          ${context.config.context}
          
          ### INSTRUCTIONS ###

          Given conversation and context above between a USER and yourself, ordered from oldest to newest, where the last one is a USER follow up question, your task is to follow these instructions step by step.
          
          ###### Step 1 ######
          Determine (in english) what's user language in the original follow up (e.g. french, english, spanish, german, italian, georgian, arabic, spanish, chinese, japanese...).

          ###### Step 2 ######
          Determine if this sentence contains profanity or bad words: "${context.conversation[context.conversation.length - 1]?.content}".

          ###### Step 3 ######
          Determine if this sentence is greetings or thanks signaling the end of a discussion: "${context.conversation[context.conversation.length - 1]?.content}".

          ###### Step 4 ######
          Determine if this sentence is a question about yourself (your name, status, license, creator, etc.): "${context.conversation[context.conversation.length - 1]?.content}".
          Some examples of question about yourself:
          - Qui es tu ?
          - Qui t'a créé ?
          - À qui ai je l'honneur de parler ?
          - À qui ai je l'honneur ?
          - "es tu..." or "tu es"...
          
          ###### Step 5 ######
          Rephrase the follow up question to be a standalone question.

          ###### Step 6 ######
          Translate in french (if needed) your result from Step 5.
                    
          ###### Step 7 ######
          Using your result from step 6, context and your knowledge, determine if USER question is about housing.
          
          ###### Step 8 ######
          Using your result from step 6 and context, provide in french 3 better search queries for web search engine to answer the given question.
          
          ###### Step 9 ######
          Using your result from step 6 and context, step back and paraphrase in french given question to a more generic step-back question.
          
          ###### Step 10 ######
          Provide in french informative answers to your results from step 6, step 7, step 8 and step 9.
          Use your extensive knowledge base to offer clear, concise, and accurate responses to inquiries.
          Be careful to use context.
          
          Answer only in french language.
          Return results in JSON.
          `.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
      }
    ]
  })

  console.log(object)
  return object
}

//
//
//
//
//
//
//
//
// ANSWER USER
//
// Cette fonction génère la réponse à la question de l'utilisateur
// Le cas échéant, elle traduit également cette réponse dans la
// langue de l'utilisateur
//
export const answer_user = async (context: AIContext) => {
  context.conversation.push({
    role: 'assistant',
    content: `
      
      # CONTEXT #
      ${context.config.persona}
      
      # OBJECTIVE #
      * Answer questions based only on the given context below.
      * Do not make up an answer or give an answer that is not supported by the provided context.
      * Recursively break-down the question into smaller questions.
      * For each atomic question:
          - Define terms.
          - Select the most relevant information from the context in light of the conversation history.
          - Generate a draft response using the selected information, whose brevity/detail are tailored for a user looking for clear answers with explanations.
          - Remove content already answered to user from the draft response.
          - Remove duplicate content from the draft response.
      * Generate your final response after adjusting it to increase accuracy and relevance.
      
      # STYLE #
      Follow the writing style of social housing experts.
      
      # TONE #
      Professional
      
      # AUDIENCE #
      People who are candidates or tenants of social housing looking for clear answer to everyday questions.
      
      # RESPONSE #
      * The response must be in ${context.lang}.
      
      Context: ${context.chunks}
      Question: ${context.translated_followup}
      Your answer:
      `.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
  })

  return await streamText({
    model: openai('gpt-4o-mini-2024-07-18'),
    // anthropic('claude-3-5-sonnet-20240620')
    // temperature: 0.5,
    messages: context.conversation,
    async onFinish({ text, usage }) {
      context.usage.completion_tokens = usage.completionTokens
      context.usage.prompt_tokens = usage.promptTokens
      context.usage.total_tokens = usage.totalTokens
      context.role = 'assistant'
      context.content = text
      save_reply(context, true)
    }
  })
}

//
//
//
//
//
//
//
//
// REACH_DEADLOCK
//
// Cette fonction génére une réponse adéquate dans les cas où :
// - l'utilisateur pose une question sans lien avec le logement
// - l'utilisateur se montre vulgaire ou irrespectueux
// - l'utilisateur signale la fin de la discussion
// - l'utilisateur demande à qui il parle
//
export const reach_deadlock = async (context: AIContext) => {
  let prompt = ''

  if (context.contains_profanity === true) {
    prompt += 'Answer in a formal tone that you can only answer polite and respectful chats. '
  }

  if (context.contains_profanity === false && context.is_about_yourself === true) {
    prompt += `
        ### USER QUESTION ###
        ${context.translated_followup}
        ### INSTRUCTION ###
        Considering USER QUESTION above, answer with an enthusiastic but formal tone considering ${context.config.persona}.
        Format your answer to improve readability.
        Do NOT sign your message. `
  }

  if (
    context.contains_profanity === false &&
    context.is_about_yourself === false &&
    context.is_about_housing === false &&
    context.is_greeting === false
  ) {
    prompt += `
        ### USER QUESTION ###
        ${context.translated_followup}
        ### INSTRUCTION ###
        Considering USER QUESTION above, answer politely that you know some stuff about user question, but you've been build to only answer questions about housing. `
  }

  if (
    context.contains_profanity === false &&
    context.is_about_yourself === false &&
    context.is_about_housing === false &&
    context.is_greeting === true
  ) {
    prompt += `
        ### USER QUESTION ###
        ${context.translated_followup}
        ### INSTRUCTION ###
        Considering USER QUESTION above, answer with an enthusiastic to their greeting. `
  }

  if (context.lang === 'french' || context.lang === 'français' || context.lang === 'fr') {
    prompt += "Answer in french using the 'vous' form. "
  } else {
    prompt += `Accurately translate your answer into ${context.lang} while preserving the meaning, tone, and nuance of your original answer.`
  }

  context.conversation.push({
    role: 'assistant',
    content: prompt.trim()
  })

  return await streamText({
    model: openai('gpt-4o-mini-2024-07-18'),
    temperature: 1,
    messages: context.conversation,
    async onFinish({ text, usage }) {
      context.usage.completion_tokens = usage.completionTokens
      context.usage.prompt_tokens = usage.promptTokens
      context.usage.total_tokens = usage.totalTokens
      context.role = 'assistant'
      context.content = text
      save_reply(context, true)
    }
  })
}
