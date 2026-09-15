import { SQL } from 'bun'
import { format } from 'date-fns'
import { z } from 'zod'

import type { AIContext } from './_schema'
import { datastorePaths } from './paths'
import { send_webhook } from './webhook'

const sql_by_path = new Map<string, SQL>()
const getSQL = () => {
  const path = datastorePaths().database
  let sql = sql_by_path.get(path)
  if (!sql) {
    sql = new SQL(`sqlite:${path}`)
    sql_by_path.set(path, sql)
  }
  return sql
}

export const save_reply = async (context: AIContext): Promise<void> => {
  if (typeof context.config === 'string') return

  await getSQL()`
    INSERT
    OR IGNORE INTO conversations ${getSQL()({
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX"),
      metadata: JSON.stringify(context.metadata),
      config: context.config.id,
      conv_id: context.conv_id,
      content: context.content,
      role: context.role
    })}
  `

  for (const element of context.config.api) {
    if (!z.url().safeParse(element.url).success) continue
    send_webhook({
      webhook: element.url,
      key: Bun.env[element.key] as string,
      max_retries: 3,
      delay: 1000,
      data: element.format({
        custom_data: context.custom_data.raw,
        content: context.content,
        role: context.role
      }) as object
    })
  }
}
