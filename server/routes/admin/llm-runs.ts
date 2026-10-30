import { z } from 'zod/v4'

import { USAGE_PERIODS } from '../../../shared/llm-usage'
import type { AuthContext } from '../../utils/authenticate-user'
import { getLlmRun, listLlmRuns, llmUsage } from '../../utils/llm-runs'

const PeriodQuery = z.object({
  period: z.enum(USAGE_PERIODS).default('30d'),
  offset: z.coerce.number().int().min(0).optional()
})

const readQuery = (c: AuthContext) =>
  PeriodQuery.safeParse({ period: c.req.query('period'), offset: c.req.query('offset') })

export const getLlmUsage = (c: AuthContext) => {
  const parsed = readQuery(c)
  if (!parsed.success) {
    return c.json({ error: { code: 'invalid_query', message: 'Période invalide.' } }, 400)
  }
  return c.json({ data: llmUsage(parsed.data.period) })
}

export const listRuns = (c: AuthContext) => {
  const parsed = readQuery(c)
  if (!parsed.success) {
    return c.json({ error: { code: 'invalid_query', message: 'Période invalide.' } }, 400)
  }
  return c.json({ data: listLlmRuns(parsed.data.period, parsed.data.offset ?? 0) })
}

export const getRun = (c: AuthContext) => {
  const run = getLlmRun(c.req.param('id') ?? '')
  if (!run) return c.json({ error: { code: 'not_found', message: 'Traitement introuvable.' } }, 404)
  return c.json({ data: run })
}
