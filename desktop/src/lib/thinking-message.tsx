import type { ReactNode } from 'react'

import { Shimmer } from '@/components/ai/shimmer'

export function formatThinkingMessage(className: string, duration?: number): ReactNode {
  if (duration === undefined) {
    return (
      <Shimmer className={className} duration={1}>
        Réflexion...
      </Shimmer>
    )
  }
  return <p className={className}>Réflexion pendant {duration} secondes</p>
}
