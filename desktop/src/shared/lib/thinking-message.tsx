import type { ReactNode } from 'react'

export function formatThinkingMessage(
  className: string,
  duration?: number,
  activeLabel = 'Réflexion'
): ReactNode {
  if (duration === undefined) {
    return <p className={className}>{activeLabel}...</p>
  }
  return (
    <p className={className}>
      {activeLabel} pendant {duration} secondes
    </p>
  )
}
