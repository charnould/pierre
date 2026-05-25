export function workflowStreamStatusLabel(opts: {
  showReasoningTokens: boolean
  isReasoningPhase: boolean
}): 'Réflexion' | 'Génération' {
  return opts.showReasoningTokens && opts.isReasoningPhase ? 'Réflexion' : 'Génération'
}
