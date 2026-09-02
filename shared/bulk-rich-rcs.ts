import type { BulkRichRcsNode } from './bulk-operations'

export type BulkRichRcsReply = {
  postbackdata: string
  label: string
}

const PLACEHOLDER_RE = /\{\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\}/

export const collect_rich_rcs_replies = (
  input: unknown,
  replies: BulkRichRcsReply[] = []
): BulkRichRcsReply[] => {
  if (Array.isArray(input)) {
    for (const item of input) collect_rich_rcs_replies(item, replies)
    return replies
  }
  if (!input || typeof input !== 'object') return replies
  const value = input as Record<string, unknown>
  if (
    value['action'] === 'Reply' &&
    typeof value['postbackdata'] === 'string' &&
    typeof value['label'] === 'string'
  ) {
    replies.push({ postbackdata: value['postbackdata'], label: value['label'] })
  }
  for (const child of Object.values(value)) collect_rich_rcs_replies(child, replies)
  return replies
}

const rich_rcs_node_issues = (
  node: BulkRichRcsNode,
  nodeIndex: number,
  nodes: readonly BulkRichRcsNode[]
): string[] => {
  const issues: string[] = []
  const replies = collect_rich_rcs_replies(node.richContent)
  const postbacks = replies.map((reply) => reply.postbackdata)
  if (postbacks.some((postback) => !postback.trim())) {
    issues.push('Reply.postbackdata must not be empty')
  }
  if (postbacks.some((postback) => PLACEHOLDER_RE.test(postback))) {
    issues.push('Reply.postbackdata must not contain placeholders')
  }
  if (new Set(postbacks).size !== postbacks.length) {
    issues.push('Reply.postbackdata must be unique within a node')
  }
  const transitionKeys = Object.keys(node.transitions)
  if (
    transitionKeys.length !== postbacks.length ||
    transitionKeys.some((key) => !postbacks.includes(key))
  ) {
    issues.push('Transition keys must exactly match Reply.postbackdata values')
  }
  const indexById = new Map(nodes.map((candidate, index) => [candidate.id, index]))
  for (const target of Object.values(node.transitions)) {
    if (target === null) continue
    const targetIndex = indexById.get(target)
    if (targetIndex === undefined) issues.push(`Unknown transition target: ${target}`)
    else if (targetIndex <= nodeIndex) {
      issues.push('Transitions must target a later node')
    }
  }
  return issues
}

export const rich_rcs_graph_issues = (nodes: readonly BulkRichRcsNode[]): string[] => {
  if (nodes.length === 0) return ['At least one node is required']
  const issues: string[] = []
  const ids = nodes.map((node) => node.id)
  if (new Set(ids).size !== ids.length) issues.push('Node ids must be unique')
  nodes.forEach((node, index) => issues.push(...rich_rcs_node_issues(node, index, nodes)))

  const reachable = new Set<string>([nodes[0]!.id])
  for (const node of nodes) {
    if (!reachable.has(node.id)) continue
    for (const target of Object.values(node.transitions)) {
      if (target !== null) reachable.add(target)
    }
  }
  for (const node of nodes) {
    if (!reachable.has(node.id)) issues.push(`Unreachable node: ${node.id}`)
  }
  return issues
}
