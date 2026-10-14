export const CARL_MODEL_FILES = [
  'model.onnx',
  'labels.json',
  'tokenizer.json',
  'tokenizer_config.json'
] as const

const CARL_TAG = /^carl-(\d+)\.(\d+)\.(\d+)$/

export function latestCarlTag(tags: readonly string[]): string {
  let best = ''
  let bestRank = [-1, -1, -1]
  for (const tag of tags) {
    const match = CARL_TAG.exec(tag)
    if (!match) continue
    const rank = [Number(match[1]), Number(match[2]), Number(match[3])]
    const newer =
      rank[0]! > bestRank[0]! ||
      (rank[0] === bestRank[0] && rank[1]! > bestRank[1]!) ||
      (rank[0] === bestRank[0] && rank[1] === bestRank[1] && rank[2]! > bestRank[2]!)
    if (!newer) continue
    best = tag
    bestRank = rank
  }
  return best
}
