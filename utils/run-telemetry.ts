import { formatISO } from 'date-fns'
import { db } from '../utils/database'
import type { AIContext } from './_schema'

//
//
//
//
//
export const save_conversation = (context: AIContext) =>
  db('telemetry')
    .prepare(
      `INSERT INTO telemetry (
        uuid,
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
      context.uuid,
      context.config.id,
      context.role,
      context.raw,
      formatISO(new Date()),
      context.usage.prompt_tokens,
      context.usage.completion_tokens,
      context.usage.total_tokens
    ])

//
//
//
//
//
export const get_conversation = (uuid: string) => {
  const conver = db('telemetry')
    .prepare(
      `
      SELECT role, content FROM telemetry
      WHERE uuid = ?
      ORDER BY timestamp ASC`
    )
    .all([uuid])

  let text_conver = ''
  for (const m of conver) {
    const role = m.role.toUpperCase()
    const content = m.content
    text_conver += `<${role}>${content}</${role}>\n`
  }

  return { raw_conversation: conver, text_conversation: text_conver }
}
