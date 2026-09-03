const WORDS_OR_WHITESPACE = /\s+|\S+/g
const WHITESPACE_ONLY = /^\s+$/
const SKIPPED_TAGS = new Set(['code', 'pre', 'svg', 'math', 'annotation'])
const STRUCTURAL_TAGS = new Set([
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'colgroup',
  'ul',
  'ol',
  'dl'
])
const MAX_ANIMATED_WORDS = 24
const WORD_STAGGER_MS = 40

type Position = {
  start?: { offset?: number }
}

type HastNode = {
  type: string
  value?: string
  tagName?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
  position?: Position
}

function units(value: string): string[] {
  return value.match(WORDS_OR_WHITESPACE) ?? []
}

function countNewWords(node: HastNode, previousLength: number, skipped = false): number {
  const skipChildren = skipped || (node.tagName ? SKIPPED_TAGS.has(node.tagName) : false)
  if (node.type === 'text' && !skipChildren && typeof node.value === 'string') {
    const base = node.position?.start?.offset ?? 0
    let consumed = 0
    let count = 0
    for (const unit of units(node.value)) {
      const end = base + consumed + unit.length
      consumed += unit.length
      if (!WHITESPACE_ONLY.test(unit) && end > previousLength) count += 1
    }
    return count
  }
  return (node.children ?? []).reduce(
    (count, child) => count + countNewWords(child, previousLength, skipChildren),
    0
  )
}

function transform(
  node: HastNode,
  previousLength: number,
  animateAfter: number,
  counter: { value: number },
  fallbackOffset: { value: number },
  skipped = false
) {
  const skipChildren = skipped || (node.tagName ? SKIPPED_TAGS.has(node.tagName) : false)
  if (!node.children || skipChildren) return

  node.children = node.children.flatMap<HastNode>((child) => {
    if (child.type === 'text' && node.tagName && STRUCTURAL_TAGS.has(node.tagName)) {
      return child
    }
    if (child.type !== 'text' || typeof child.value !== 'string') {
      transform(child, previousLength, animateAfter, counter, fallbackOffset, skipChildren)
      return child
    }

    const base = child.position?.start?.offset ?? fallbackOffset.value
    let consumed = 0
    return units(child.value).map((unit) => {
      const start = base + consumed
      const end = start + unit.length
      consumed += unit.length
      fallbackOffset.value += unit.length
      const key = `t${start}`

      if (WHITESPACE_ONLY.test(unit)) {
        return {
          type: 'element',
          tagName: 'span',
          properties: { 'data-pierre-stream-key': key },
          children: [{ type: 'text', value: unit }]
        }
      }

      const isNew = end > previousLength
      const ordinal = isNew ? counter.value++ : -1
      const animate = isNew && ordinal >= animateAfter
      return {
        type: 'element',
        tagName: 'span',
        properties: animate
          ? {
              'data-pierre-stream-key': key,
              'data-pierre-stream-animate': true,
              style: `--pierre-stream-delay:${(ordinal - animateAfter) * WORD_STAGGER_MS}ms`
            }
          : {
              'data-pierre-stream-key': key,
              'data-pierre-stream-shown': true
            },
        children: [{ type: 'text', value: unit }]
      }
    })
  })
}

export function createStreamingWordsPlugin(previousLength: number) {
  return function rehypeStreamingWords() {
    return function applyStreamingWords(tree: HastNode) {
      const newWords = countNewWords(tree, previousLength)
      const animateAfter = Math.max(0, newWords - MAX_ANIMATED_WORDS)
      transform(tree, previousLength, animateAfter, { value: 0 }, { value: 0 })
    }
  }
}
