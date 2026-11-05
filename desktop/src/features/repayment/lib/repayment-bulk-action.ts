import { ACTIVITY_CONTENT_VERSION, type CreateActivityBody } from '@/shared/types/activites'

import type { TenantRepaymentRow } from './classify-tenants'
import {
  buildRepaymentAdvancementOperations,
  buildRepaymentTagChangeOperations
} from './repayment-activity-mutations'
import { isDepartedTenantRow, type RepaymentBucketId } from './repayment-bucket'
import { canonicalizeRepaymentTags } from './repayment-tags'

export type RepaymentBulkAction =
  | { kind: 'phase'; phase: string }
  | { kind: 'tag'; operation: 'add' | 'remove'; tag: string }
  | { kind: 'pierre'; mission: 'reponse' | 'synthese' | 'autre'; instruction: string }

export type RepaymentBulkResult = {
  succeeded: string[]
  failed: string[]
  stopped: boolean
}

export function repaymentTagsAfter(
  previous: readonly string[],
  operation: 'add' | 'remove',
  tag: string
): string[] {
  const current = canonicalizeRepaymentTags(previous)
  const next = operation === 'add' ? [...current, tag] : current.filter((entry) => entry !== tag)
  return canonicalizeRepaymentTags(next)
}

export function pierreMissionContext(
  action: Extract<RepaymentBulkAction, { kind: 'pierre' }>
): string {
  if (action.mission === 'reponse')
    return 'Rédige une réponse possible au locataire. Ne l’envoie pas.'
  if (action.mission === 'synthese') {
    return 'Rédige une synthèse interne du dossier pour le chargé de recouvrement.'
  }
  return action.instruction.trim()
}

export function pierreArtifactTitle(mission: 'reponse' | 'synthese' | 'autre'): string {
  if (mission === 'reponse') return 'Réponse possible'
  if (mission === 'synthese') return 'Synthèse'
  return 'Note de Pierre'
}

export function repaymentTagsOf(row: TenantRepaymentRow): string[] {
  const value = row['repayment_tags']
  if (!Array.isArray(value)) return []
  return canonicalizeRepaymentTags(value.filter((tag): tag is string => typeof tag === 'string'))
}

export function buildPierreArtifact(
  ref: string,
  action: Extract<RepaymentBulkAction, { kind: 'pierre' }>,
  note: string,
  generatedBy: string
): CreateActivityBody {
  return {
    contexte: 'repayment',
    ref,
    type: 'artifact.generated',
    contenu: JSON.stringify({
      version: ACTIVITY_CONTENT_VERSION,
      title: pierreArtifactTitle(action.mission),
      values: {
        skill: 'repayment',
        mission: action.mission,
        generated_by: generatedBy
      },
      note
    })
  }
}

export async function runRepaymentBulk(input: {
  ids: readonly string[]
  action: RepaymentBulkAction
  rows: readonly TenantRepaymentRow[]
  getBucket: (row: TenantRepaymentRow) => RepaymentBucketId
  setBucket: (id: string, phase: RepaymentBucketId) => void
  clearBucket: (id: string, phase: RepaymentBucketId) => void
  shouldStop: () => boolean
  onProgress: (index: number, total: number) => void
  writeActivity: (activity: CreateActivityBody) => Promise<boolean>
  generate: (id: string, mission: string) => Promise<string | null>
  generatedBy: string
}): Promise<RepaymentBulkResult> {
  const rows = new Map(input.rows.map((row) => [row.id_locataire, row]))
  const succeeded: string[] = []
  const failed: string[] = []
  let stopped = false
  const total = input.ids.length

  for (let index = 0; index < input.ids.length; index += 1) {
    if (input.shouldStop()) {
      stopped = true
      failed.push(...input.ids.slice(index))
      break
    }
    const id = input.ids[index]!
    input.onProgress(index + 1, total)
    const ok = await applyRepaymentBulkRow({ ...input, id, row: rows.get(id) ?? null })
    if (input.shouldStop() && !ok) {
      stopped = true
      failed.push(id, ...input.ids.slice(index + 1))
      break
    }
    if (ok) succeeded.push(id)
    else failed.push(id)
  }

  return { succeeded, failed, stopped }
}

async function applyRepaymentBulkRow(input: {
  id: string
  row: TenantRepaymentRow | null
  action: RepaymentBulkAction
  getBucket: (row: TenantRepaymentRow) => RepaymentBucketId
  setBucket: (id: string, phase: RepaymentBucketId) => void
  clearBucket: (id: string, phase: RepaymentBucketId) => void
  writeActivity: (activity: CreateActivityBody) => Promise<boolean>
  generate: (id: string, mission: string) => Promise<string | null>
  generatedBy: string
}): Promise<boolean> {
  const { id, row, action } = input
  if (!row) return false

  if (action.kind === 'phase') {
    if (isDepartedTenantRow(row)) return false
    const previous = input.getBucket(row)
    if (previous === action.phase) return true
    input.setBucket(id, action.phase)
    const operations = buildRepaymentAdvancementOperations({
      ref: id,
      bucket: action.phase,
      comment: '',
      previousBucket: previous
    })
    const ok = await writeOperations(
      operations.map((operation) => operation.activity),
      input.writeActivity
    )
    if (!ok) input.clearBucket(id, action.phase)
    return ok
  }

  if (action.kind === 'tag') {
    const previous = repaymentTagsOf(row)
    const next = repaymentTagsAfter(previous, action.operation, action.tag)
    const operations = buildRepaymentTagChangeOperations({
      ref: id,
      tags: next,
      previousTags: previous,
      comment: ''
    })
    if (operations.length === 0) return true
    return writeOperations(
      operations.map((operation) => operation.activity),
      input.writeActivity
    )
  }

  const mission = pierreMissionContext(action)
  if (!mission) return false
  const note = await input.generate(id, mission)
  if (!note?.trim()) return false
  return input.writeActivity(buildPierreArtifact(id, action, note.trim(), input.generatedBy))
}

async function writeOperations(
  activities: CreateActivityBody[],
  writeActivity: (activity: CreateActivityBody) => Promise<boolean>
): Promise<boolean> {
  if (activities.length === 0) return true
  for (const activity of activities) {
    if (!(await writeActivity(activity))) return false
  }
  return true
}
