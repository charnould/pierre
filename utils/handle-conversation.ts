import type { Database } from 'bun:sqlite'
import { format } from 'date-fns'
import { z } from 'zod'
import { db } from '../utils/database'
import type { AIContext, Reply } from './_schema'
import { send_webhook } from './webhook'

const database = db('datastore') as Database

/**
 * Retrieves a conversation from the database
 * based on the provided conversation ID.
 *
 * @param conv_id - The unique identifier of the conversation to retrieve.
 * @returns An array of conversation records, each with parsed metadata.
 *
 * This function is tested.
 */
export const get_conversation = (conv_id: string) => {
  try {
    return database
      .prepare('SELECT * FROM telemetry WHERE conv_id = $conv_id ORDER BY timestamp ')
      .all({ $conv_id: conv_id })
      .map((record) => ({ ...record, metadata: JSON.parse(record.metadata) }))
  } catch (e) {
    console.error(e)
  }
}

/**
 * Deletes a conversation from the telemetry database.
 *
 * @param conv_id - The unique identifier of the conversation to be deleted.
 * @returns The result of the database operation.
 *
 *  This function is tested.
 */
export const delete_conversation = (conv_id: string) => {
  try {
    return database
      .prepare('DELETE FROM telemetry WHERE conv_id = $conv_id')
      .run({ $conv_id: conv_id })
  } catch (e) {
    console.error(e)
  }
}

/**
 * Saves a reply to the database and sends webhooks if applicable.
 *
 * @param {AIContext} context - The context object containing conversation details and configuration.
 * @returns {void} - A promise that resolves when the operation is complete.
 *
 *  This function is tested.
 *
 * The function performs the following steps:
 * 1. Checks if the `context.config` is not a string.
 * 2. Inserts the conversation details into the `telemetry` table in the database.
 * 3. Iterates over the `api` array in the `context.config` object.
 * 4. For each element in the `api` array, checks if the URL is valid.
 * 5. Formats the data and sends a webhook to the specified URL with retries.
 */
export const save_reply = (context: AIContext): void => {
  try {
    if (typeof context.config !== 'string') {
      database
        .prepare(
          'INSERT OR IGNORE INTO telemetry (conv_id, config, role, content, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          context.conv_id,
          context.config.id,
          context.role,
          context.content,
          format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
          JSON.stringify(context.metadata)
        )

      for (const element of context.config.api) {
        // Check if URL is a fully qualified URL
        if (z.string().url().safeParse(element.url).success) {
          const data = element.format({
            role: context.role,
            content: context.content,
            custom_data: context.custom_data.raw
          }) as object

          send_webhook({
            webhook: element.url,
            key: Bun.env[element.key] as string,
            data: data,
            delay: 1000,
            max_retries: 3
          })
        }
      }
    }
  } catch (e) {
    console.error(e)
  }

  return
}

/**
 * Updates the score and comment for a conversation in the telemetry database.
 *
 * @param {Object} params - The parameters for scoring the conversation.
 * @param {string} params.conv_id - The ID of the conversation to be scored.
 * @param {string} params.scorer - The entity providing the score (customer, organization, or ai).
 * @param {number} params.score - The score to be assigned to the conversation.
 * @param {string} params.comment - The comment to be associated with the score.
 * @returns {void} A promise that resolves when the operation is complete.
 *
 *  This function is tested.
 */
export const score_conversation = ({
  conv_id,
  scorer,
  score,
  comment
}: {
  conv_id: string
  scorer: string
  score: number
  comment: string
}): void => {
  try {
    database
      .prepare(
        `UPDATE telemetry SET metadata = json_set(
            metadata,
            ${scorer === 'customer' ? "'$.evaluation.customer.score', $score, '$.evaluation.customer.comment', $comment" : ''}
            ${scorer === 'organization' ? "'$.evaluation.organization.score', $score, '$.evaluation.organization.comment', $comment" : ''}
            ${scorer === 'ai' ? "'$.evaluation.ai.score', $score, '$.evaluation.ai.comment', $comment" : ''}
          )
          WHERE conv_id = $conv_id`
      )
      .run({ $conv_id: conv_id, $score: score, $comment: comment })
  } catch (e) {
    console.error(e)
  }

  return
}

/**
 * Updates the topic of a conversation in the telemetry database.
 *
 * @param {Object} params - The parameters for updating the topic.
 * @param {string} params.conv_id - The ID of the conversation to update.
 * @param {string} params.topic - The new topic to set for the conversation.
 * @returns {void}
 *
 *  This function is tested.
 */
export const save_topic = ({ conv_id, topic }: { conv_id: string; topic: string }): void => {
  try {
    database
      .prepare(
        `
          UPDATE telemetry SET metadata = json_set(metadata, '$.topics', $topic)
          WHERE conv_id = $conv_id
          `
      )
      .run({ $conv_id: conv_id, $topic: topic })
  } catch (e) {
    console.error(e)
  }

  return
}

/**
 * Retrieves a list of conversations from the database.
 *
 * This function queries the `telemetry` table, ordering the results by
 * the `timestamp` field in descending order. Each record's `metadata`
 * field is parsed from JSON format.
 *
 * @returns {Reply[]} An array of conversation records with parsed metadata.
 */
export const get_conversations = (): Reply[] => {
  try {
    return database
      .prepare('SELECT * FROM telemetry ORDER BY timestamp DESC')
      .all()
      .map((record) => ({ ...record, metadata: JSON.parse(record.metadata) })) as Reply[]
  } catch (e) {
    console.error(e)
  }
}
