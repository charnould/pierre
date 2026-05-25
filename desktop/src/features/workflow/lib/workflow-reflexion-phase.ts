/** Whether the analyse column should show the Réflexion phase UI. */
export function shouldShowReflexion(opts: {
  showReasoningTokens: boolean
  isReasoningPhase: boolean
  analysisStarted: boolean
}): boolean {
  return opts.showReasoningTokens && opts.isReasoningPhase && !opts.analysisStarted
}
