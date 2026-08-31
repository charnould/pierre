'use client'

import { ChevronDownIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { Collapsible, CollapsibleTrigger } from '@/shared/components/ui/collapsible'
import { formatThinkingMessage } from '@/shared/lib/thinking-message'
import { cn } from '@/shared/lib/utils'

const ReasoningContext = createContext<{ duration: number | undefined } | null>(null)

const useReasoning = () => {
  const context = useContext(ReasoningContext)
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning')
  }
  return context
}

type ReasoningDisplayMode = 'partial' | 'full'

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean
  isReasoningActive?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  duration?: number
  sealDuration?: boolean
  displayMode?: ReasoningDisplayMode
}

const MS_IN_S = 1000

export const Reasoning = memo(
  ({
    className,
    isStreaming = false,
    isReasoningActive: isReasoningActiveProp,
    open,
    defaultOpen,
    onOpenChange,
    duration: durationProp,
    sealDuration: sealDurationProp,
    displayMode = 'full',
    children,
    ...props
  }: ReasoningProps) => {
    const isPartial = displayMode === 'partial'
    const isExplicitlyClosed = isPartial || defaultOpen === false

    const [internalOpen, setInternalOpen] = useState(isPartial ? false : (defaultOpen ?? true))
    const isOpen = open ?? internalOpen

    const [timedDuration, setTimedDuration] = useState<number>()
    const duration = durationProp ?? timedDuration

    const startTimeRef = useRef<number | null>(null)
    const isReasoningActive = isReasoningActiveProp ?? isStreaming
    const [wasReasoningActive, setWasReasoningActive] = useState(isReasoningActive)
    const isTimingLive = isStreaming && durationProp === undefined
    const shouldSeal = sealDurationProp ?? !isStreaming

    if (wasReasoningActive !== isReasoningActive) {
      setWasReasoningActive(isReasoningActive)
      if (
        displayMode === 'full' &&
        !isExplicitlyClosed &&
        isReasoningActive !== isOpen &&
        open === undefined
      ) {
        setInternalOpen(isReasoningActive)
      }
    }

    useEffect(() => {
      if (isTimingLive) {
        if (startTimeRef.current === null) {
          startTimeRef.current = Date.now()
        }

        const tick = () => {
          if (startTimeRef.current !== null) {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / MS_IN_S)
            setTimedDuration(Math.max(1, elapsed))
          }
        }

        tick()
        const id = setInterval(tick, MS_IN_S)
        return () => clearInterval(id)
      }

      if (shouldSeal && startTimeRef.current !== null) {
        setTimedDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S))
        startTimeRef.current = null
      }
    }, [isTimingLive, shouldSeal])

    const handleOpenChange = useCallback(
      (next: boolean) => {
        if (open === undefined) setInternalOpen(next)
        onOpenChange?.(next)
      },
      [onOpenChange, open]
    )

    const contextValue = useMemo(() => ({ duration }), [duration])

    return (
      <ReasoningContext.Provider value={contextValue}>
        <Collapsible
          className={cn('mb-4', className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    )
  }
)

export type ReasoningTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  getThinkingMessage?: (duration?: number) => ReactNode
}

const REASONING_TRIGGER_CLASS =
  'flex items-center gap-1.5 text-sm font-normal text-muted-foreground transition-opacity hover:opacity-85'

const triggerTextClass = cn(REASONING_TRIGGER_CLASS, 'm-0 w-full')

const defaultGetThinkingMessage = (duration?: number) =>
  formatThinkingMessage(triggerTextClass, duration)

export const ReasoningTrigger = memo(
  ({
    className,
    children,
    getThinkingMessage = defaultGetThinkingMessage,
    ...props
  }: ReasoningTriggerProps) => {
    const { duration } = useReasoning()

    return (
      <CollapsibleTrigger className={cn(REASONING_TRIGGER_CLASS, 'w-full', className)} {...props}>
        {children ?? (
          <>
            {getThinkingMessage(duration)}
            <ChevronDownIcon className="text-muted-foreground size-3 shrink-0 transition-transform in-data-[panel-open]:rotate-180" />
          </>
        )}
      </CollapsibleTrigger>
    )
  }
)

Reasoning.displayName = 'Reasoning'
ReasoningTrigger.displayName = 'ReasoningTrigger'
