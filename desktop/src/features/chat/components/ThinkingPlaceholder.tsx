import { useEffect, useState } from 'react'

import { cn } from '@/shared/lib/utils'

interface Props {
  placeholders: string[]
}

function pickPlaceholderIndex(placeholders: string[], excludeIndex?: number): number {
  if (placeholders.length === 0) return 0
  let index = Math.floor(Math.random() * placeholders.length)
  if (excludeIndex !== undefined && index === excludeIndex) {
    index = (index + 1) % placeholders.length
  }
  return index
}

/** Cycles through server-provided placeholders while the model is thinking. */
export function ThinkingPlaceholder({ placeholders }: Props) {
  const [index, setIndex] = useState(() => pickPlaceholderIndex(placeholders))
  const [visible, setVisible] = useState(true)

  const text = placeholders[index] ?? placeholders[0] ?? ''

  useEffect(() => {
    if (placeholders.length <= 1) return

    let lastIndex = index
    const intervalId = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        const nextIndex = pickPlaceholderIndex(placeholders, lastIndex)
        lastIndex = nextIndex
        setIndex(nextIndex)
        setVisible(true)
      }, 300)
    }, 3000)

    return () => clearInterval(intervalId)
  }, [placeholders, index])

  return (
    <p
      className={cn(
        'text-sm text-muted-foreground transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0'
      )}
    >
      {text}
    </p>
  )
}
