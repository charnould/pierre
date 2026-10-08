import {
  buildCaseBucketChangeActivity,
  buildCaseTagChangeActivity
} from '@/shared/lib/activities/case-activities'
import type { TicketRow } from '@/shared/types'
import { ACTIVITY_CONTENT_VERSION, type CreateActivityBody } from '@/shared/types/activites'

import { resolveTicketBucket } from './ticket-bucket'
import { canonicalizeTicketTags, ticketTagOptions } from './ticket-tags'

export type TicketBulkAction =
  | { kind: 'phase'; phase: string }
  | { kind: 'tag'; operation: 'add' | 'remove'; tag: string }
  | { kind: 'pierre'; mission: 'reponse' | 'synthese' | 'autre'; instruction: string }

export type TicketBulkResult = {
  succeeded: string[]
  failed: string[]
  stopped: boolean
}

export function ticketTagsAfter(
  previous: readonly string[],
  operation: 'add' | 'remove',
  tag: string
): string[] {
  const current = canonicalizeTicketTags(previous)
  const next = operation === 'add' ? [...current, tag] : current.filter((entry) => entry !== tag)
  return canonicalizeTicketTags(next)
}

export function ticketPierreContext(action: Extract<TicketBulkAction, { kind: 'pierre' }>): string {
  if (action.mission === 'reponse')
    return 'Rédige une réponse possible au locataire. Ne l’envoie pas.'
  if (action.mission === 'synthese') return 'Rédige une synthèse interne de la réclamation.'
  return action.instruction.trim()
}

export function ticketPierreTitle(mission: 'reponse' | 'synthese' | 'autre'): string {
  if (mission === 'reponse') return 'Réponse possible'
  if (mission === 'synthese') return 'Synthèse'
  return 'Note de Pierre'
}

export function ticketTagsOf(row: TicketRow): string[] {
  const value = row.pierre_tags
  if (!Array.isArray(value)) return []
  return canonicalizeTicketTags(value.filter((tag): tag is string => typeof tag === 'string'))
}

export function buildTicketPierreArtifact(
  ref: string,
  action: Extract<TicketBulkAction, { kind: 'pierre' }>,
  note: string,
  generatedBy: string
): CreateActivityBody {
  return {
    contexte: 'tickets',
    ref,
    type: 'artifact.generated',
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      title: ticketPierreTitle(action.mission),
      values: {
        skill: 'replies',
        mission: action.mission,
        generated_by: generatedBy
      },
      note
    })
  }
}

export async function runTicketBulk(input: {
  rows: readonly TicketRow[]
  action: TicketBulkAction
  shouldStop: () => boolean
  onProgress: (index: number, total: number) => void
  writeActivity: (activity: CreateActivityBody) => Promise<boolean>
  generate: (id: string, mission: string) => Promise<string | null>
  generatedBy: string
}): Promise<TicketBulkResult> {
  const succeeded: string[] = []
  const failed: string[] = []
  let stopped = false
  const total = input.rows.length

  for (let index = 0; index < input.rows.length; index += 1) {
    if (input.shouldStop()) {
      stopped = true
      failed.push(...input.rows.slice(index).map(ticketId))
      break
    }
    const row = input.rows[index]!
    const id = ticketId(row)
    input.onProgress(index + 1, total)
    const ok = await applyTicketBulkRow({ ...input, id, row })
    if (input.shouldStop() && !ok) {
      stopped = true
      failed.push(id, ...input.rows.slice(index + 1).map(ticketId))
      break
    }
    if (ok) succeeded.push(id)
    else failed.push(id)
  }

  return { succeeded, failed, stopped }
}

async function applyTicketBulkRow(input: {
  id: string
  row: TicketRow
  action: TicketBulkAction
  writeActivity: (activity: CreateActivityBody) => Promise<boolean>
  generate: (id: string, mission: string) => Promise<string | null>
  generatedBy: string
}): Promise<boolean> {
  const { id, row, action } = input
  if (!id) return false

  if (action.kind === 'phase') {
    const previous = resolveTicketBucket(
      typeof row.pierre_bucket === 'string' ? row.pierre_bucket : null
    )
    const activity = buildCaseBucketChangeActivity({
      contexte: 'tickets',
      ref: id,
      bucket: action.phase,
      previousBucket: previous,
      comment: ''
    })
    if (!activity) return true
    return input.writeActivity(activity)
  }

  if (action.kind === 'tag') {
    const previous = ticketTagsOf(row)
    const next = ticketTagsAfter(previous, action.operation, action.tag)
    const activity = buildCaseTagChangeActivity({
      contexte: 'tickets',
      ref: id,
      tags: next,
      previousTags: previous,
      tagOptions: ticketTagOptions(),
      comment: ''
    })
    if (!activity) return true
    return input.writeActivity(activity)
  }

  const mission = ticketPierreContext(action)
  if (!mission) return false
  const note = await input.generate(id, mission)
  if (!note?.trim()) return false
  return input.writeActivity(buildTicketPierreArtifact(id, action, note.trim(), input.generatedBy))
}

function ticketId(row: TicketRow): string {
  const value = row.id_reclamation
  return value == null ? '' : String(value).trim()
}
