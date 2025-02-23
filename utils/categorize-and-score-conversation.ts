import type { CoreMessage } from 'ai'
import dedent from 'dedent'
import type { Reply } from './_schema'
import { extract_tag_value } from './augment-query'
import { db } from './database'
import { generate_text } from './generate-output'
import { get_conversation, save_topic, score_conversation } from './handle-conversation'

/**
 * Scores conversations using an AI model.
 *
 * This function retrieves conversation IDs that have no score from the
 * database, then for each conversation, it retrieves the conversation content,
 * uses a language model to determine the score and reasoning, and saves the
 * score back into the database.
 *
 * The scoring process involves:
 * 1. Retrieving all conversation content.
 * 2. Using a language model to evaluate the conversation and determine a score.
 * 3. Saving the score and reasoning back into the database.
 *
 * The score is determined based on how well the AI understood and addressed the
 * user's intent, with the following scale:
 * - 0: Completely failed
 * - 1: Somewhat relevant but major issues
 * - 2: Mostly good but minor flaws
 * - 3: Perfectly understood and responded
 *
 * If the conversation contains only one message, a specific score and comment
 * are assigned.
 *
 * @returns {Promise<void>} A promise that resolves when the scoring process is
 * complete.
 */
export const score_conversation_with_ai = async (): Promise<void> => {
  // Get the `conv_id` of conversations that have no score
  const conv_ids_missing_score = db('datastore')
    .prepare(
      `
      SELECT DISTINCT conv_id FROM telemetry
      WHERE json_extract(metadata, '$.evaluation.ai.score') IS NULL;`
    )
    .all()
    .map((row) => row.conv_id)

  // For each conversation:
  // 1. Retrieve all conversation content.
  // 2. Use an LLM to determine the topic.
  // 3. Save the topic back into the database.
  for await (const conv_id of conv_ids_missing_score) {
    const conversation = get_conversation(conv_id) as Reply[]
    const core_messages = conversation.map(({ role, content }) => ({
      role,
      content
    })) as CoreMessage[]

    let score: number | string | null | boolean
    let comment: number | string | null | boolean

    if (core_messages.length === 1) {
      score = 'one_message_only'
      comment = "PIERRE n'a pas répondu ou l'utilisateur a quitté la conversation"
    } else {
      const messages: CoreMessage[] = [
        ...core_messages,
        {
          role: 'assistant',
          content:
            'Read the full preceding conversation between a user and an AI assistant, evaluating how well the AI understood and addressed the user’s intent. Assign a score from 0 to 3: 0 (completely failed), 1 (somewhat relevant but major issues), 2 (mostly good but minor flaws), 3 (perfectly understood and responded). Output only the score in the format <score>S</score>, where S is the score, followed by your 20-75 word-reasoning in the format <reasoning>R</reasoning>, where R is the reasoning in french language. Think carefully before answering to ensure an accurate evaluation based on clarity, relevance, and correctness.'
        }
      ]

      const config = (await import('../assets/pierre-ia.org/config')).default
      const model = config.context.default.models.answer_with
      const answer = await generate_text({ model: model, messages: messages, max_tokens: 200 })

      score = extract_tag_value(answer, 'score', null)
      comment = extract_tag_value(answer, 'reasoning', null)
    }

    score_conversation({ conv_id: conv_id, scorer: 'ai', score: score, comment: comment })
  }

  return
}

/**
 * Assigns a topic to conversations that have no assigned topic using AI.
 *
 * This function performs the following steps:
 * 1. Retrieves the `conv_id` of conversations that have no assigned topic from the database.
 * 2. For each conversation, retrieves all conversation content.
 * 3. Uses a language model to determine the topic of the conversation.
 * 4. Saves the determined topic back into the database.
 *
 * The predefined categories for topics are:
 * - 'rent': The discussion pertains to rent payments.
 * - 'life': The conversation is about daily living in the residence.
 * - 'insurance': The topic concerns a home insurance.
 * - 'moving': The discussion revolves around relocation.
 * - 'technical': The conversation involves maintenance requests.
 * - 'contact': The user is inquiring about ways to contact the lessor.
 * - 'chatbot': The user is asking about the chatbot.
 * - 'multiple': More than one of the above categories is equally relevant.
 * - 'unknown': None of the above categories accurately describe the conversation.
 *
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
export const assign_topic_with_ai = async (): Promise<void> => {
  // Get the `conv_id` of conversations that have no assigned topic
  const conv_ids_missing_topic = db('datastore')
    .prepare(
      `
      SELECT DISTINCT conv_id FROM telemetry
      WHERE json_extract(metadata, '$.topics') IS NULL;
      `
    )
    .all()
    .map((row) => row.conv_id)

  // For each conversation:
  // 1. Retrieve all conversation content.
  // 2. Use an LLM to determine the topic.
  // 3. Save the topic back into the database.
  for await (const conv_id of conv_ids_missing_topic) {
    const conversation = get_conversation(conv_id) as Reply[]
    const core_messages = conversation.map(({ role, content }) => ({
      role,
      content
    })) as CoreMessage[]

    const messages: CoreMessage[] = [
      ...core_messages,
      {
        role: 'assistant',
        content: dedent`
        
        Analyze the full preceding conversation and classify its primary topic into exactly one of the following predefined categories:
        
        - 'rent': The discussion pertains to rent payments, due dates, amounts, late fees, or related financial matters.
        - 'life': The conversation is about daily living in the residence, neighbors, amenities, social aspects, or general experiences.
        - 'insurance': The topic concerns a home insurance certificate, its submission, validity, or related requirements.
        - 'moving': The discussion revolves around relocation, move-in/move-out dates, lease transfers, or associated logistics.
        - 'technical': The conversation involves maintenance requests, repairs, internet issues, heating problems, or any technical difficulties in the residence.
        - 'contact': The user is inquiring about ways to contact the lessor, landlord, or property management.
        - 'social_housing': The user is asking about obtaining social housing, eligibility, application procedures, waiting lists, or related topics.
        - 'chatbot': The user is asking about the chatbot, how responses are generated, or related AI-specific questions.
        - 'multiple': More than one of the above categories is equally relevant.
        - 'unknown': None of the above categories accurately describe the conversation.
        
        Response Instructions:
        - Return only the exact category name (e.g., rent).
        - Do not include explanations, extra words, formatting, or any additional output.
        - Ensure the classification is 100% consistent and deterministic based on the given definitions.
        
        Your classification:`.trim()
      }
    ]

    const config = (await import('../assets/pierre-ia.org/config')).default
    const model = config.context.default.models.answer_with
    const topic = (await generate_text({ model: model, messages: messages, max_tokens: 50 }))
      .toLowerCase()
      .trim()

    const topics = [
      'rent',
      'life',
      'insurance',
      'moving',
      'technical',
      'contact',
      'social_housing',
      'chatbot',
      'multiple',
      'unknown'
    ]

    if (topics.includes(topic)) save_topic({ conv_id: conv_id, topic: topic })
  }

  return
}
