import { Database } from 'bun:sqlite'
import { format } from 'date-fns'
import { db } from '../utils/database'
import type { AIContext, Reply } from './_schema'

//
//
// Get ONE conversation
export const get_conversation = (conv_id: string) => {
  const database = db('telemetry')

  if (database instanceof Database) {
    const records = database
      .prepare('SELECT * FROM telemetry WHERE conv_id = $conv_id ORDER BY timestamp ')
      .all({ $conv_id: conv_id })

    for (const record of records) record.metadata = JSON.parse(record.metadata)

    return records
  }

  throw new Error('Invalid database type for telemetry_db')
}

//
//
// Delete a full conversation
export const delete_conversation = (conv_id: string) => {
  const database = db('telemetry')

  if (database instanceof Database) {
    return database
      .prepare('DELETE FROM telemetry WHERE conv_id = $conv_id')
      .run({ $conv_id: conv_id })
  }

  throw new Error('Invalid database type for telemetry_db')
}

//
//
// Save a reply (to a conversation)
export const save_reply = async (context: AIContext, telemetry: boolean) => {
  try {
    const database = db('telemetry')

    if (database instanceof Database && typeof context.config !== 'string') {
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
    }

    // Telemetry
    if (Bun.env.TELEMETRY === 'true' && telemetry === true) {
      await fetch('https://assistant.pierre-ia.org/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      })
    }
  } catch {}

  return
}

//
//
// Score a full conversation
export const score_conversation = async (
  { conv_id, scorer, score, comment },
  telemetry: boolean
) => {
  try {
    const database = db('telemetry')

    if (database instanceof Database) {
      database
        .prepare(
          `UPDATE telemetry SET metadata = json_set(
            metadata,
            ${scorer === 'customer' ? "'$.evaluation.customer.score', $score, '$.evaluation.customer.comment', $comment" : ''}
            ${scorer === 'organization' ? "'$.evaluation.organization.score', $score, '$.evaluation.organization.comment', $comment" : ''}
            ${scorer === 'pierre' ? "'$.evaluation.pierre.score', $score, '$.evaluation.pierre.comment', $comment" : ''}
            ${scorer === 'ai' ? "'$.evaluation.ai.score', $score, '$.evaluation.ai.comment', $comment" : ''}
          )
          WHERE conv_id = $conv_id`
        )
        .run({ $conv_id: conv_id, $score: score, $comment: comment })
    }

    // Telemetry
    if (Bun.env.TELEMETRY === 'true' && telemetry === true) {
      await fetch('https://assistant.pierre-ia.org/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conv_id: conv_id,
          scorer: scorer,
          score: score,
          comment: comment
        })
      })
    }
  } catch {}

  return
}

//
//
// Get all conversations for review (./eval)
export const get_conversations = (): Reply[] => {
  const database = db('telemetry')

  if (database instanceof Database) {
    const stringified_results = database
      .prepare('SELECT * FROM telemetry ORDER BY timestamp DESC')
      .all() as Reply[]

    for (const record of stringified_results) record.metadata = JSON.parse(record.metadata)

    return stringified_results
  }

  throw new Error('Invalid database type for telemetry_db')
}
