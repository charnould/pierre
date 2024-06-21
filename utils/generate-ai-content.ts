import { createOpenAI } from '@ai-sdk/openai'
import { generateObject, streamText } from 'ai'
import { format } from 'date-fns/format'
import { z } from 'zod'
import type { AIContext } from './_schema'
import { save_conversation } from './run-telemetry'

const openai = createOpenAI({ apiKey: Bun.env.OPENAI_API_KEY })

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
// en un "objet augmenté" permettant de comprendre ses intentions
// et d'optimiser la recherche future des connaissance pertinentes.
//
export const enhance_query = async (context: AIContext) => {
  const { object } = await generateObject({
    ////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////
    // TODO : Vous pouvez changer ici le modèle (LLM) utilisé
    // Ex.  : openai('gpt-4o-2024-05-13'), openai('gpt-3.5-turbo')...
    model: openai('gpt-4o-2024-05-13'),
    ////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////

    // biome-ignore format: readability
    schema: z.object({
      lang            : z.string().describe('User language'),
      follow_up       : z.string().describe('User follow up'),
      vagueness       : z.number().describe('A vagueness scale from 0 to 10'),
      about_housing   : z.boolean().describe('Is follow up about housing?'),
      queries         : z.array(z.string()).describe('Best search queries for web search engine'),
      stepback        : z.string().describe('A more generic question'),
      hyde            : z.array(z.string()).describe('Three short sentences answering queries and stepback'),
      keywords        : z.array(z.string()).describe('Keywords describing query')
    }),
    mode: 'json',
    messages: [
      {
        role: 'system',
        content: `
          Using conversation below between a USER and an ASSISTANT, ordered from oldest to newest, where the last one is a USER follow up question, your task is to follow these instructions step by step.
          
          ### INSTRUCTIONS ###
          
          ###### Step 1 ######
          What's user language in the follow up (e.g. french, english, spanish, german, italian, georgian, arabic, spanish, chinese, japonese...)?
          
          ###### Step 2 ######
          Rephrase the follow up to be a standalone question to make it easier to follow.
          
          ###### Step 3 ######
          Using your result from step 2, determine user question vagueness.
          Use a scale from 0 to 10 with 10 meaning "very vague".
          Example:
          - I'm looking for a flat = 10
          - I'm looking for a social housing in Cantal county = 0
          
          ###### Step 4 ######
          Using your result from step 2 and your knowledge, determine if USER question is about housing.
          
          ###### Step 5 ######
          Using your result from step 2, provide in french 3 better search queries for web search engine to answer the given question.
          
          ###### Step 6 ######
          Using your result from step 2, step back and paraphrase in french given question to a more generic step-back question.
          
          ###### Step 7 ######
          Provide in french informative answers to your results from step 2, step 3, step 4, step 5.
          Use your extensive knowledge base to offer clear, concise, and accurate responses to inquiries.
          
          ###### Step 8 ######
          Using all your previous results: infer keywords optimized for web search.
          
          Answer only in french language.
          Return results in JSON.
          
          ### CONVERSATION ###
          
          ${context.text_conversation}
          `
      }
    ]
  })

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
  context.raw_conversation.push({
    role: 'assistant',
    content: `
      You're a helpful AI assistant.
      Knowledge cutoff: 2024-06.
      Current date: ${format(new Date(), 'yyyy-MM-dd')}.
      Generate a comprehensive and informative answer (but no more than 200 words) for a given question solely based on the provided context.
      You must only use information from the provided context.
      Use an unbiased and journalistic tone.
      Combine context together into a coherent answer.
      Always format your answer in markdown using a structured markup when applicable (h1, h2, list...).
      Do not repeat text.
      ${context.lang === 'french' ? '' : `Think in french but translate your answer in ${context.lang}.`}
      <context>${context.chunks}</context>
      <question>${context.raw}</question>
      `
  })

  return await streamText({
    ////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////
    // TODO : Vous pouvez changer ici le modèle (LLM) utilisé
    // Ex.  : openai('gpt-4o-2024-05-13'), openai('gpt-3.5-turbo')...
    model: openai('gpt-4o-2024-05-13'),
    ////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////

    messages: context.raw_conversation,
    async onFinish({ text }) {
      context.raw = text
      save_conversation(context)
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
// Cette fonction génére une réponse informant l'utilisateur que
// sa requête n'est pas assez précise ou ne concerne pas le logement.
// De fait, PIERRE ne peut lui répondre.
//
export const reach_deadlock = async (context: AIContext) => {
  context.raw_conversation.push({
    role: 'system',
    content: `
      You're PIERRE, a helpful artificial intelligence and social housing expert. You're also an alpha version and currently learning.
      Using USER QUESTION below, your task is to follow these instructions step by step.
          
      ### INSTRUCTIONS ###

      ###### Case 1 ######
      If user's question about yourself.
      Then answer who you are and that you're ready to help.
      
      ###### Case 2 ######
      If user's question is not about housing and totally off topic: 
      Then:
      - aknowledge user's intent with a bit of humour.
      - answer politely that you cannot answer.
      
      ###### Case 3 ######
      If user's question is about housing but vague: 
      Then explain you can help to submit an application for social housing if user provides more details (e.g. location).

      ###### In all cases ######
      ${context.lang === 'french' ? '' : `Accurately translate your answer into ${context.lang} while preserving the meaning, tone, and nuance of your original answer.`}
      Format your answer with line breaks to improve readability.
      Use a diplomatic tone.

      ### USER QUESTION ###

      ${context.follow_up}
    `
  })

  return await streamText({
    ////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////
    // TODO : Vous pouvez changer ici le modèle (LLM) utilisé
    // Ex.  : openai('gpt-4o-2024-05-13'), openai('gpt-3.5-turbo')...
    model: openai('gpt-4o-2024-05-13'),
    ////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////

    messages: context.raw_conversation,
    async onFinish({ text }) {
      context.raw = text
      save_conversation(context)
    }
  })
}
