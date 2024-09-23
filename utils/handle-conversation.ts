import { db } from '../utils/database'
import type { AIContext, Reply } from './_schema'

//
//
//
//
//
export const get_conversation = (id: string): Reply[] =>
  db('telemetry')
    .prepare('SELECT * FROM telemetry WHERE id = $id ORDER BY timestamp ASC')
    .all({ $id: id })

//
//
//
//
//
export const delete_conversation = (id: string) =>
  db('telemetry').prepare('DELETE FROM telemetry WHERE id = $id').run({ $id: id })

//
//
//
//
//
export const save_reply = async (context: AIContext, telemetry: boolean) => {
  try {
    db('telemetry')
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
      .run([
        context.id,
        context.config.id,
        context.model,
        context.role,
        context.content,
        new Date().toISOString(),
        context.usage.prompt_tokens,
        context.usage.completion_tokens,
        context.usage.total_tokens
      ])

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
//
//
//
export const score_conversation = async ({ id, scorer, score, comment }, telemetry: boolean) => {
  try {
    db('telemetry')
      .prepare(
        ` UPDATE telemetry
          SET
            ${scorer === 'reviewer' ? 'reviewer_score = $score ,' : ''}
            ${scorer === 'reviewer' ? 'reviewer_comment = $comment' : ''}
            ${scorer === 'user' ? 'user_score = $score' : ''}    
        WHERE id = $id `
      )

      .run({ $id: id, $score: score, $comment: comment })

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
//
//
//
export const get_conversations_for_review = (): Reply[] =>
  db('telemetry').prepare('SELECT * FROM telemetry ORDER BY timestamp DESC').all()
