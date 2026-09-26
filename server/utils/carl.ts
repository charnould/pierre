import { SERVER_ROOT } from './paths'

export const CARL_DIR = `${SERVER_ROOT}/models/carl`
export const SEQUENCE_LENGTH = 128

export const HEADS = [
  'code',
  'integrite_physique',
  'lieu',
  'obligation_reglementaire',
  'ton'
] as const

export const FIELDS = [
  'domaine',
  'sous_domaine',
  'motif',
  'integrite_physique',
  'lieu',
  'obligation_reglementaire',
  'ton'
] as const

export type Field = (typeof FIELDS)[number]
export type Mention = Record<Field, string>
export type Head = (typeof HEADS)[number]

export type CarlLabels = Record<Head, string[]>

const SIDE = ['integrite_physique', 'lieu', 'obligation_reglementaire', 'ton'] as const
const SPECIAL = new Set(['hors_perimetre', 'inexploitable'])

export async function modelFilesPresent(): Promise<boolean> {
  const names = ['model.onnx', 'labels.json', 'tokenizer.json', 'tokenizer_config.json']
  const present = await Promise.all(names.map((name) => Bun.file(`${CARL_DIR}/${name}`).exists()))
  return present.every(Boolean)
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

type Predicted = Record<(typeof SIDE)[number], string>

export function legalize(code: string, predicted: Predicted): Mention {
  const ton = predicted.ton
  if (SPECIAL.has(code)) {
    return {
      domaine: code,
      sous_domaine: 'sans_objet',
      motif: 'sans_objet',
      integrite_physique: 'sans_objet',
      lieu: 'sans_objet',
      obligation_reglementaire: 'sans_objet',
      ton
    }
  }
  const [domaine, sous_domaine, motif, extra] = code.split('.')
  if (!domaine || !sous_domaine || !motif || extra !== undefined) {
    throw new Error(`étiquette illisible: ${code}`)
  }
  return {
    domaine,
    sous_domaine,
    motif,
    integrite_physique: predicted.integrite_physique,
    lieu: predicted.lieu,
    obligation_reglementaire:
      domaine === 'technique' ? predicted.obligation_reglementaire : 'sans_objet',
    ton
  }
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

function labelAt(labels: readonly string[], index: number): string {
  const label = labels[index]
  if (label === undefined) throw new Error(`indice de label hors vocabulaire: ${index}`)
  return label
}

export function decodeLogits(labels: CarlLabels, logits: Float32Array[]): Mention {
  if (logits.length !== HEADS.length) throw new Error('logits Carl incomplets')
  const codeLogits = logits[0]
  if (!codeLogits) throw new Error('logits Carl incomplets')
  const predicted = {} as Predicted
  for (const [offset, field] of SIDE.entries()) {
    const head = logits[offset + 1]
    if (!head) throw new Error(`logits manquants: ${field}`)
    predicted[field] = labelAt(labels[field], argmax(head))
  }
  return legalize(labelAt(labels.code, argmax(codeLogits)), predicted)
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
