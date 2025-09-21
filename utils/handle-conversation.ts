import { SQL } from 'bun'
import { format } from 'date-fns'
import { z } from 'zod'
import type { AIContext, Reply } from './_schema'
import { send_webhook } from './webhook'

const sql = new SQL(`sqlite:datastores/${Bun.env.SERVICE}/datastore.sqlite`)

/**
 * Retrieves all conversation replies associated with the specified conversation ID.
 *
 * Queries the `telemetry` table for records matching the given `conv_id`, ordered by timestamp.
 * The `metadata` field of each record is parsed from a JSON string into an object.
 *
 * @param conv_id - The unique identifier of the conversation to retrieve.
 * @returns A promise that resolves to an array of `Reply` objects representing the conversation history.
 *
 * This function is tested.
 *
 */
export const get_conversation = async (conv_id: string): Promise<Reply[]> => {
  const records = await sql`
    SELECT
      *
    FROM
      telemetry
    WHERE
      conv_id = ${conv_id}
    ORDER BY
      timestamp
  `
  return records.map((record: { metadata: string }) => ({
    ...record,
    metadata: JSON.parse(record.metadata)
  }))
}

/**
 * Deletes a conversation from the telemetry database by its conversation ID.
 *
 * @param conv_id - The unique identifier of the conversation to delete.
 * @returns A promise that resolves when the deletion is complete.
 *
 * This function is tested.
 *
 */
export const delete_conversation = async (conv_id: string) =>
  await sql`
    DELETE FROM telemetry
    WHERE
      conv_id = ${conv_id}
  `

/**
 * Saves a reply to the telemetry database and sends webhooks for each configured API endpoint.
 *
 * If the `context.config` is not a string, the function inserts a telemetry record into the database,
 * including metadata, configuration ID, conversation ID, content, and role. For each API endpoint in
 * `context.config.api`, if the endpoint URL is valid, it formats the data and sends a webhook with
 * the specified configuration.
 *
 * @param context - The AIContext object containing configuration, metadata, conversation details, and content.
 * @returns A Promise that resolves when the operation is complete.
 *
 * This function is tested.
 *
 */
export const save_reply = async (context: AIContext): Promise<void> => {
  if (typeof context.config !== 'string') {
    await sql`
      INSERT
      OR IGNORE INTO telemetry ${sql({
        timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
        metadata: JSON.stringify(context.metadata),
        config: context.config.id,
        conv_id: context.conv_id,
        content: context.content,
        role: context.role
      })}
    `

    for (const element of context.config.api) {
      if (z.url().safeParse(element.url).success) {
        const data = element.format({
          custom_data: context.custom_data.raw,
          content: context.content,
          role: context.role
        }) as object

        send_webhook({
          webhook: element.url,
          key: Bun.env[element.key] as string,
          max_retries: 3,
          delay: 1000,
          data: data
        })
      }
    }
  }

  return
}

/**
 * Updates the evaluation score and comment for a conversation in the telemetry database.
 *
 * Depending on the `scorer` value ('organization', 'customer', or 'ai'), this function sets the corresponding
 * score and comment fields in the conversation's metadata JSON object.
 *
 * @param conv_id - The unique identifier of the conversation to update.
 * @param scorer - The entity providing the score ('organization', 'customer', or 'ai').
 * @param score - The numerical score to assign.
 * @param comment - The comment associated with the score.
 * @returns A Promise that resolves when the update is complete.
 *
 * This function is tested.
 *
 */
export const score = async ({
  conv_id,
  scorer,
  score,
  comment
}: {
  conv_id: string
  scorer: string
  score: number
  comment: string
}): Promise<void> =>
  await sql`
    UPDATE telemetry
    SET
      metadata = json_set (
        metadata,
        ${scorer === 'organization'
      ? sql`
          '$.evaluation.organization.score',
          ${score},
          '$.evaluation.organization.comment',
          ${comment}
        `
      : sql``} ${scorer === 'customer'
      ? sql`
          '$.evaluation.customer.score',
          ${score},
          '$.evaluation.customer.comment',
          ${comment}
        `
      : sql``} ${scorer === 'ai'
      ? sql`
          '$.evaluation.ai.score',
          ${score},
          '$.evaluation.ai.comment',
          ${comment}
        `
      : sql``}
      )
    WHERE
      conv_id = ${conv_id}
  `

/**
 * Updates the `topics` field in the `metadata` JSON column for a specific conversation in the `telemetry` table.
 *
 * @param conv_id - The unique identifier of the conversation to update.
 * @param topic - The topic to set in the conversation's metadata.
 * @returns A promise that resolves when the update operation is complete.
 *
 * This function is tested.
 *
 */
export const save_topic = async ({ conv_id, topic }: { conv_id: string; topic: string }) =>
  await sql`
    UPDATE telemetry
    SET
      metadata = json_set (
        metadata,
        '$.topics',
        ${topic}
      )
    WHERE
      conv_id = ${conv_id}
  `

/**
 * Retrieves all conversation records from the `telemetry` table, ordered by descending timestamp.
 * Parses the `metadata` field from a JSON string to an object for each record.
 *
 * @returns {Promise<Reply[]>} A promise that resolves to an array of conversation records with parsed metadata.
 *
 * This function is tested.
 */
export const get_conversations = async (): Promise<Reply[]> => {
  const records = await sql`
    SELECT
      *
    FROM
      telemetry
    ORDER BY
      timestamp DESC
  `
  return records.map((record: { metadata: string }) => ({
    ...record,
    metadata: JSON.parse(record.metadata)
  }))
}
