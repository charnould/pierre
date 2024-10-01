import { Database } from 'bun:sqlite'
import { format } from 'date-fns'
import { db } from '../utils/database'
import type { AIContext, Reply } from './_schema'

//
//
// Get ONE conversation
// Test: OK
export const get_conversation = (conv_id: string) => {
  const tdb = db('telemetry')

  if (tdb instanceof Database) {
    return tdb
      .prepare('SELECT * FROM telemetry WHERE id = $id ORDER BY timestamp ')
      .all({ $id: conv_id }) as Reply[]
  }

  throw new Error('Invalid database type for telemetry_db')
}

//
//
// Delete ONE conversation
// Test : OK
export const delete_conversation = (conv_id: string) => {
  const tdb = db('telemetry')

  if (tdb instanceof Database) {
    return tdb.prepare('DELETE FROM telemetry WHERE id = $id').run({ $id: conv_id })
  }

  throw new Error('Invalid database type for telemetry_db')
}

//
//
// Save ONE reply (a single part of a conversation)
// Test: OK
// TODO: Test "outside telemetry"
export const save_reply = async (context: AIContext, telemetry: boolean) => {
  try {
    const telemetry_db = db('telemetry')

    if (telemetry_db instanceof Database && typeof context.config !== 'string') {
      telemetry_db
        .prepare(
          `INSERT INTO telemetry (
            id,
            config,
            model,
            role,
            content,
            timestamp,
            prompt_tokens,
            completion_tokens,
            total_tokens
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          context.id,
          context.config.id,
          context.config.model,
          context.role,
          context.content,
          format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
          context.usage.prompt_tokens,
          context.usage.completion_tokens,
          context.usage.total_tokens
        )
    }

    // Telemetry
    if (Bun.env.TELEMETRY === 'true' && telemetry === true) {
      await fetch('https://pierre-ia.org/telemetry', {
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
// Score ONE conversation (= all parts/replies)
// Test: ok
// TODO: Test "outside telemetry"
export const score_conversation = async ({ id, scorer, score, comment }, telemetry: boolean) => {
  try {
    const tdb = db('telemetry')

    if (tdb instanceof Database) {
      tdb
        .prepare(
          `UPDATE telemetry
           SET
            ${scorer === 'customer' ? 'cus_satisfaction = $score ,' : ''}
            ${scorer === 'customer' ? 'cus_comment = $comment' : ''}
            ${scorer === 'external' ? 'ext_satisfaction = $score ,' : ''}
            ${scorer === 'external' ? 'ext_comment = $comment' : ''}
            ${scorer === 'organization' ? 'org_satisfaction = $score ,' : ''}
            ${scorer === 'organization' ? 'org_comment = $comment' : ''}
          WHERE id = $id `
        )
        .run({ $id: id, $score: score, $comment: comment })
    }

    // Telemetry
    if (Bun.env.TELEMETRY === 'true' && telemetry === true) {
      await fetch('https://pierre-ia.org/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
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
// Get ALL conversations for review (./eval)
// Test: OK
export const get_conversations_for_review = (): Reply[] => {
  const tdb = db('telemetry')

  if (tdb instanceof Database) {
    return tdb.prepare('SELECT * FROM telemetry ORDER BY timestamp DESC').all() as Reply[]
  }

  throw new Error('Invalid database type for telemetry_db')
}
