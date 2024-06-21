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
    .prepare('INSERT INTO telemetry (uuid, config, role, content, timestamp) VALUES (?, ?, ?, ?, ?)')
    .run([context.uuid, context.config.config, context.role, context.raw, formatISO(new Date())])

//
//
//
//
//
export const get_conversation = (uuid: string) => {
  const conver = db('telemetry')
    .prepare('SELECT role, content from telemetry WHERE uuid = ? ORDER BY timestamp ASC')
    .all([uuid])

  let text_conver = ''
  for (const m of conver) {
    const role = m.role.toUpperCase()
    const content = m.content
    text_conver += `<${role}>${content}</${role}>\n`
  }

  return { raw_conversation: conver, text_conversation: text_conver }
}
