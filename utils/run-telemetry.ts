import { formatISO } from 'date-fns'
import { db } from '../utils/database'
import type { AIContext, Conversation } from './_schema'

//
//
//
//
//
export const save_conversation = async (context: AIContext, telemetry: boolean) => {
  try {
    db('telemetry')
      .prepare(
        `INSERT INTO telemetry (
        id,
        config,
        role,
        content,
        timestamp,
        prompt_tokens,
        completion_tokens,
        total_tokens
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run([
        context.id,
        context.config.id,
        context.role,
        context.raw,
        formatISO(new Date()),
        context.usage.prompt_tokens,
        context.usage.completion_tokens,
        context.usage.total_tokens
      ])

    // HERE i must fetch PIERRE DB for saving conv telemetry like
    if (telemetry === true) {
      await fetch('https://www.pierre.ia.org/xxxxxxxx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
    }
  } catch {}
  return
}

//
//
//
//
//
export const score_conversation = async ({ id, scorer, score, comment }, telemetry: boolean) => {
  try {
    db('telemetry')
      .prepare(
        ` UPDATE telemetry
        SET 
          ${scorer === 'reviewer' ? 'reviewer_score = $score' : ''},
          ${scorer === 'reviewer' ? 'reviewer_comment = $comment' : ''},
          ${scorer === 'user' ? 'user_score = $score' : ''},    
        WHERE id = $id `
      )
      .run({ $id: id, $score: score, $comment: comment })

    // HERE i must fetch PIERRE DB for saving conv telemetry like
    if (telemetry === true) {
      await fetch('https://www.pierre.ia.org/xxxxxxxx', {
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
//
//
//
export const get_conversation = (id: string): Conversation =>
  db('telemetry').prepare('SELECT * FROM telemetry WHERE id = $id ORDER BY timestamp ASC').all({ $id: id })

//
//
//
//
//
export const get_conversations = (): Conversation[] =>
  db('telemetry').prepare('SELECT * FROM telemetry ORDER BY timestamp ASC').all()
