import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { SERVER_ROOT } from './paths'

export const CARL_DIR = join(SERVER_ROOT, 'models', 'carl')
export const SEQUENCE_LENGTH = 128

export const FIELDS = [
  'niveau_1',
  'niveau_2',
  'niveau_3',
  'urgence',
  'danger_personnes',
  'lieu',
  'registre'
] as const

export type Field = (typeof FIELDS)[number]
export type Mention = Record<Field, string | null>

export type Floor = {
  urgence: string
  danger: string
  monte: string[]
} | null

export type CarlLabels = {
  motif: [string, string, string][]
  urgence: string[]
  danger_personnes: string[]
  lieu: string[]
  registre: string[]
  plancher?: Floor[]
}

const URGENCE_RANK = ['planifiable', 'sous_quelques_jours', 'dans_la_journee', 'immediat']
const DANGER_RANK = ['aucun', 'potentiel', 'avere']

const SIDE = ['urgence', 'danger_personnes', 'lieu', 'registre'] as const

export function modelFilesPresent(): boolean {
  return (
    existsSync(join(CARL_DIR, 'model.onnx')) &&
    existsSync(join(CARL_DIR, 'labels.json')) &&
    existsSync(join(CARL_DIR, 'tokenizer.json')) &&
    existsSync(join(CARL_DIR, 'tokenizer_config.json'))
  )
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function applyNulls(mention: Mention): Mention {
  if (mention.niveau_1 === 'hors_demande') {
    return {
      niveau_1: 'hors_demande',
      niveau_2: null,
      niveau_3: null,
      urgence: null,
      danger_personnes: null,
      lieu: null,
      registre: null
    }
  }
  if (mention.niveau_1 === 'inexploitable') {
    return {
      ...mention,
      niveau_2: null,
      niveau_3: null,
      urgence: null,
      danger_personnes: null,
      lieu: null
    }
  }
  return mention
}

function argmax(values: Float32Array): number {
  let best = 0
  for (let index = 1; index < values.length; index++) {
    const value = values[index] ?? Number.NEGATIVE_INFINITY
    const current = values[best] ?? Number.NEGATIVE_INFINITY
    if (value > current) best = index
  }
  return best
}

function clampLevel(
  value: string | null,
  floor: string,
  monte: string[],
  rank: readonly string[]
): string {
  const allowed = new Set([floor, ...monte.filter((item) => rank.includes(item))])
  const floorRank = rank.indexOf(floor)
  const valueRank = value === null ? -1 : rank.indexOf(value)
  if (value !== null && allowed.has(value) && valueRank >= floorRank) return value
  return floor
}

export function legalize(labels: CarlLabels, mention: Mention): Mention {
  const out = applyNulls({ ...mention })
  if (out.niveau_1 === 'hors_demande') return out
  if (out.niveau_1 === 'inexploitable') {
    if (out.registre === null) out.registre = 'standard'
    return out
  }
  if (out.registre === null) out.registre = 'standard'
  const floors = labels.plancher
  if (!floors) return out
  const index = labels.motif.findIndex(
    ([niveau1, niveau2, niveau3]) =>
      niveau1 === out.niveau_1 &&
      niveau2 === (out.niveau_2 ?? 'null') &&
      niveau3 === (out.niveau_3 ?? 'null')
  )
  const floor = index >= 0 ? floors[index] : null
  if (!floor) return out
  out.urgence = clampLevel(out.urgence, floor.urgence, floor.monte, URGENCE_RANK)
  out.danger_personnes = clampLevel(out.danger_personnes, floor.danger, floor.monte, DANGER_RANK)
  return out
}

function labelAt(labels: readonly string[], index: number): string {
  const label = labels[index]
  if (label === undefined) throw new Error(`indice de label hors vocabulaire: ${index}`)
  return label
}

export function decodeLogits(labels: CarlLabels, logits: Float32Array[]): Mention {
  const motifLogits = logits[0]
  if (!motifLogits || logits.length !== 5) throw new Error('logits Carl incomplets')
  const motif = labels.motif[argmax(motifLogits)]
  if (!motif) throw new Error('motif hors vocabulaire')
  const [niveau_1, niveau_2, niveau_3] = motif
  const mention: Mention = {
    niveau_1,
    niveau_2: niveau_2 === 'null' ? null : niveau_2,
    niveau_3: niveau_3 === 'null' ? null : niveau_3,
    urgence: null,
    danger_personnes: null,
    lieu: null,
    registre: null
  }
  for (const [offset, field] of SIDE.entries()) {
    const head = logits[offset + 1]
    if (!head) throw new Error(`logits manquants: ${field}`)
    const label = labelAt(labels[field], argmax(head))
    mention[field] = label === 'null' ? null : label
  }
  return legalize(labels, mention)
}

export function padTokens(
  ids: number[],
  padId: number
): { inputIds: BigInt64Array; attentionMask: BigInt64Array } {
  const trimmed = ids.slice(0, SEQUENCE_LENGTH)
  const length = Math.max(trimmed.length, 1)
  const inputIds = new BigInt64Array(length)
  const attentionMask = new BigInt64Array(length)
  for (let index = 0; index < trimmed.length; index++) {
    inputIds[index] = BigInt(trimmed[index] ?? padId)
    attentionMask[index] = 1n
  }
  if (trimmed.length === 0) {
    inputIds[0] = BigInt(padId)
    attentionMask[0] = 0n
  }
  return { inputIds, attentionMask }
}
