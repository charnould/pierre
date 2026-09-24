import { readFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { join } from 'node:path'

import { Tokenizer } from '@huggingface/tokenizers'
import type { InferenceSession } from 'onnxruntime-node'

import { CARL_DIR, decodeLogits, normalize, padTokens, type Mention, type CarlLabels } from './carl'

const THREADS = Math.min(4, availableParallelism())

type Engine = {
  labels: CarlLabels
  tokenizer: Tokenizer
  padId: number
  session: InferenceSession
}

let loading: Promise<Engine> | null = null

async function loadEngine(): Promise<Engine> {
  const ort = await import('onnxruntime-node')
  const labels = JSON.parse(readFileSync(join(CARL_DIR, 'labels.json'), 'utf8')) as CarlLabels
  const tokenizerConfig = JSON.parse(
    readFileSync(join(CARL_DIR, 'tokenizer_config.json'), 'utf8')
  ) as { pad_token?: string }
  const tokenizer = new Tokenizer(
    JSON.parse(readFileSync(join(CARL_DIR, 'tokenizer.json'), 'utf8')) as object,
    tokenizerConfig
  )
  const padToken = tokenizerConfig.pad_token ?? '[PAD]'
  const padId = tokenizer.token_to_id(padToken)
  if (padId === undefined) throw new Error(`jeton de padding absent: ${padToken}`)
  const session = await ort.InferenceSession.create(join(CARL_DIR, 'model.onnx'), {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
    intraOpNumThreads: THREADS,
    interOpNumThreads: 1,
    enableCpuMemArena: true,
    // The length follows the message, so a fixed memory pattern would miss.
    enableMemPattern: false
  })
  return { labels, tokenizer, padId, session }
}

function engine(): Promise<Engine> {
  loading ??= loadEngine().catch((error: unknown) => {
    loading = null
    throw error
  })
  return loading
}

export async function classify(text: string): Promise<Mention> {
  const ready = await engine()
  const encoded = ready.tokenizer.encode(normalize(text))
  const { inputIds, attentionMask } = padTokens(encoded.ids, ready.padId)
  const ort = await import('onnxruntime-node')
  const outputs = await ready.session.run({
    input_ids: new ort.Tensor('int64', inputIds, [1, inputIds.length]),
    attention_mask: new ort.Tensor('int64', attentionMask, [1, attentionMask.length])
  })
  const order = ['motif', 'urgence', 'danger_personnes', 'lieu', 'registre'] as const
  const logits = order.map((name) => {
    const tensor = outputs[name]
    if (!tensor || !(tensor.data instanceof Float32Array)) {
      throw new Error(`sortie ONNX absente: ${name}`)
    }
    return tensor.data
  })
  return decodeLogits(ready.labels, logits)
}
