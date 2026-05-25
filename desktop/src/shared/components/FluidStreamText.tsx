import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import {
  buildQueuedUnits,
  type FluidStreamUnit,
  type QueuedStreamUnit
} from '@/shared/lib/fluid-text-stream'
import { cn } from '@/shared/lib/utils'

export type FluidStreamTextProps = {
  text: string
  isStreaming?: boolean
  unit?: FluidStreamUnit
  staggerMs?: number
  className?: string
  as?: 'p' | 'div' | 'span'
}

const DEFAULT_STAGGER_MS = 12

export function FluidStreamText({
  text,
  isStreaming = false,
  unit = 'word',
  staggerMs = DEFAULT_STAGGER_MS,
  className,
  as: Tag = 'p'
}: FluidStreamTextProps) {
  const snapshotRef = useRef('')
  const [chunks, setChunks] = useState<QueuedStreamUnit[]>([])
  const queueRef = useRef<QueuedStreamUnit[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const batchStaggerRef = useRef(0)
  const delayByIdRef = useRef<Map<number, number>>(new Map())

  const drainQueue = () => {
    if (queueRef.current.length === 0) {
      timerRef.current = null
      batchStaggerRef.current = 0
      return
    }
    const [next, ...rest] = queueRef.current
    queueRef.current = rest
    delayByIdRef.current.set(next.id, batchStaggerRef.current * staggerMs)
    batchStaggerRef.current += 1
    setChunks((prev) => [...prev, next])
    timerRef.current = setTimeout(drainQueue, staggerMs)
  }

  useLayoutEffect(() => {
    const { units, snapshot } = buildQueuedUnits(snapshotRef.current, text, { unit })
    snapshotRef.current = snapshot

    if (units.length === 0) {
      if (!text) setChunks([])
      return
    }

    queueRef.current.push(...units)
    batchStaggerRef.current = 0
    if (!timerRef.current) drainQueue()
  }, [text, unit, staggerMs])

  useEffect(() => {
    if (isStreaming) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    queueRef.current = []
    batchStaggerRef.current = 0
    delayByIdRef.current = new Map()
    const { units, snapshot } = buildQueuedUnits('', text, { unit })
    snapshotRef.current = snapshot
    setChunks(units.length > 0 ? units : text ? [{ id: -1, text }] : [])
  }, [isStreaming, text, unit])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!text && chunks.length === 0) return null

  return (
    <Tag className={cn(className)}>
      {chunks.map((chunk) => (
        <span
          key={chunk.id}
          className="workflow-stream-chunk"
          style={{
            animationDelay: `${delayByIdRef.current.get(chunk.id) ?? 0}ms`
          }}
        >
          {chunk.text}
        </span>
      ))}
    </Tag>
  )
}
