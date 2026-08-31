import type { ReactNode } from 'react'

export const EASE = [0.22, 1, 0.36, 1] as const
export const EASE_IN = [0.4, 0, 1, 1] as const

export const panelScreen = {
  hidden: { opacity: 0, y: 18, transition: { duration: 0.22, ease: EASE_IN } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } }
}

export function workflowReasoningToggleLabel(agentName: string): string {
  return `Raisonnement de ${agentName}`
}

export function workflowReasoningToggleDescription(): string {
  return 'Cliquer pour afficher le raisonnement'
}

export function workflowReasoningToggleMessage(agentName: string, duration?: number): ReactNode {
  const label = workflowReasoningToggleLabel(agentName)
  if (duration === undefined) return label
  return (
    <>
      {label}
      <span className="tabular-nums"> · {duration}&nbsp;s</span>
    </>
  )
}
