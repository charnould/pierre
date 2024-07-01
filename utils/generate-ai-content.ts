import { createAnthropic } from '@ai-sdk/anthropic'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { generateObject, streamText } from 'ai'
import { format } from 'date-fns/format'
import { z } from 'zod'
import type { AIContext } from './_schema'
import { save_conversation } from './run-telemetry'

const openai = createOpenAI({
  apiKey: Bun.env.OPENAI_API_KEY,
  compatibility: 'strict'
})
const mistral = createMistral({ apiKey: Bun.env.MISTRAL_API_KEY })
const anthropic = createAnthropic({ apiKey: Bun.env.ANTHROPIC_API_KEY })

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

    // prettier-ignore
    // biome-ignore format: readability
    schema: z.object({
      lang            : z.string().describe('User language'),
      followup        : z.string().describe('User follow up'),
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
          ### CONVERSATION ###
          
          ${context.text_conversation}
          
          ### CONTEXT ###

          ${context.config.context}
          
          ### INSTRUCTIONS ###

          Using conversation and context above between a USER and an ASSISTANT, ordered from oldest to newest, where the last one is a USER follow up question, your task is to follow these instructions step by step.
          
          ###### Step 1 ######
          What's user language in the follow up (e.g. french, english, spanish, german, italian, georgian, arabic, spanish, chinese, japonese...)?
          
          ###### Step 2 ######
          Rephrase the follow up to be a standalone question to make it easier to follow.
          
          ###### Step 3 ######
          Using your result from step 2 and context, determine user question vagueness.
          Use a scale from 0 to 10 with 10 meaning "very vague".
          Examples:
          - I'm looking for a flat = 10
          - I'm looking for a social housing in Cantal county = 0
          
          ###### Step 4 ######
          Using your result from step 2, context and your knowledge, determine if USER question is about housing.
          
          ###### Step 5 ######
          Using your result from step 2 and context, provide in french 3 better search queries for web search engine to answer the given question.
          
          ###### Step 6 ######
          Using your result from step 2 and context, step back and paraphrase in french given question to a more generic step-back question.
          
          ###### Step 7 ######
          Provide in french informative answers to your results from step 2, step 3, step 4, step 5.
          Use your extensive knowledge base to offer clear, concise, and accurate responses to inquiries.
          Be carefule to use context.
          
          ###### Step 8 ######
          Using all your previous results: infer keywords optimized for web search.
          
          Answer only in french language.
          Return results in JSON.
          `.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
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
      ### INSTRUCTIONS ###
      You are a customer support agent, helping users by following directives and answering questions.
      Generate your response by following the steps below:
      1. Recursively break-down the question into smaller questions/directives.
      2. For each atomic question/directive:
      2a. Select the most relevant information from the context in light of the conversation history.
      3. Generate a draft response using the selected information, whose brevity/detail are tailored for a user looking for clear answers with explanations.
      4. Remove content already answered to user from the draft response.
      5. Remove duplicate content from the draft response.
      6. Generate your final response after adjusting it to increase accuracy and relevance.
      7. Translate your answer in ${context.lang}.
      8. Now only show your final response! Do not provide any explanations or details.

      ### IMPORTANT ###
      ${context.config.context}

      ### CONTEXT ###
      ${context.chunks}

      ### QUESTION ###
      ${context.followup}
      
      ### OTHER INFORMATION ###
      Knowledge cutoff: 2024-07.
      Current date: ${format(new Date(), 'yyyy-MM-dd')}.
      `.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
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

    //
    async onFinish({ text, usage }) {
      context.usage.completion_tokens = usage.completionTokens
      context.usage.prompt_tokens = usage.promptTokens
      context.usage.total_tokens = usage.totalTokens
      context.role = 'assistant'
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
    role: 'assistant',
    content: `
      You're Pierre, a helpful artificial intelligence and social housing expert. You're also an alpha version and currently learning.
      Using USER QUESTION below, your task is to follow these instructions step by step.
          
      ### INSTRUCTIONS ###

      ###### Case 1 ######
      If user's question contains any bad words or profanity.
      Then answer how can only handle polite and respectful chats.

      ###### Case 2 ######
      If user's question is about yourself.
      Then answer who you are and that you're ready to help.
      
      ###### Case 3 ######
      If user's question is not about housing: 
      Then:
      - aknowledge user's intent.
      - answer politely that you cannot answer.

      For your information, question asking about: arpej, domofrance, ancols ARE about housing.
      
      ###### Case 4 ######
      If user's question is about housing but vague: 
      Then explain you can help to submit an application for social housing if user provides more details (e.g. location).

      ###### In all cases ######
      ${context.lang === 'french' ? 'Answer in french' : `Accurately translate your answer into ${context.lang} while preserving the meaning, tone, and nuance of your original answer.`}
      Format your answer with line breaks to improve readability.
      Use a thoughtful tone.

      ### CONTEXT ###
      ${context.chunks}

      ### USER QUESTION ###

      ${context.followup}
      `.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
  })

  return await streamText({
    ////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////
    // Choisir le modèle (LLM) qui sera utilisé
    // Il est impératif d'avoir l'api_key correspondante dans .env
    //  openai('gpt-4o-2024-05-13')
    //  openai('gpt-3.5-turbo')
    //  anthropic('claude-3-5-sonnet-20240620')
    model: openai('gpt-4o-2024-05-13'),
    ////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////

    messages: context.raw_conversation,

    //
    async onFinish({ text, usage, finishReason }) {
      context.usage.completion_tokens = usage.completionTokens
      context.usage.prompt_tokens = usage.promptTokens
      context.usage.total_tokens = usage.totalTokens
      context.role = 'assistant'
      context.raw = text
      save_conversation(context)
    }
  })
}
