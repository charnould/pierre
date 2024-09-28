import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { z } from 'zod'
import type { AIContext } from './_schema'

const openai = createOpenAI({ apiKey: Bun.env.OPENAI_API_KEY, compatibility: 'strict' })

//
// ███████╗███╗   ██╗██╗  ██╗ █████╗ ███╗   ██╗ ██████╗███████╗
// ██╔════╝████╗  ██║██║  ██║██╔══██╗████╗  ██║██╔════╝██╔════╝
// █████╗  ██╔██╗ ██║███████║███████║██╔██╗ ██║██║     █████╗
// ██╔══╝  ██║╚██╗██║██╔══██║██╔══██║██║╚██╗██║██║     ██╔══╝
// ███████╗██║ ╚████║██║  ██║██║  ██║██║ ╚████║╚██████╗███████╗
// ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
//  ██████╗ ██╗   ██╗███████╗██████╗ ██╗   ██╗
// ██╔═══██╗██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝
// ██║   ██║██║   ██║█████╗  ██████╔╝ ╚████╔╝
// ██║▄▄ ██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝
// ╚██████╔╝╚██████╔╝███████╗██║  ██║   ██║
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
