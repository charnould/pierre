'use client'

import { useControllableState } from '@radix-ui/react-use-controllable-state'
import { cjk } from '@streamdown/cjk'
import { code } from '@streamdown/code'
import { math } from '@streamdown/math'
import { mermaid } from '@streamdown/mermaid'
import { BrainIcon, ChevronDownIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { Streamdown } from 'streamdown'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { formatThinkingMessage } from '@/lib/thinking-message'
import { cn } from '@/lib/utils'

interface ReasoningContextValue {
  isStreaming: boolean
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  duration: number | undefined
}

const ReasoningContext = createContext<ReasoningContextValue | null>(null)

export const useReasoning = () => {
  const context = useContext(ReasoningContext)
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning')
  }
  return context
}

export type ReasoningDisplayMode = 'partial' | 'full'

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean
  /** True while reasoning tokens are actively streaming (full mode auto open/close). */
  isReasoningActive?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  duration?: number
  /** When true, freeze and persist elapsed time (typically when the whole generation ends). */
  sealDuration?: boolean
  /** partial = replié par défaut ; full = déplié par défaut, repliable */
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
    const resolvedDefaultOpen = isPartial ? false : (defaultOpen ?? true)
    const isExplicitlyClosed = isPartial || defaultOpen === false

    const [isOpen, setIsOpen] = useControllableState<boolean>({
      defaultProp: resolvedDefaultOpen,
      onChange: onOpenChange,
      prop: open
    })
    const [duration, setDuration] = useControllableState<number | undefined>({
      defaultProp: undefined,
      prop: durationProp
    })

    const startTimeRef = useRef<number | null>(null)
    const prevReasoningActiveRef = useRef(false)
    const isReasoningActive = isReasoningActiveProp ?? isStreaming
    const isTimingLive = isStreaming && durationProp === undefined
    const shouldSeal = sealDurationProp ?? !isStreaming

    // Live timer while streaming; seal only when generation fully ends
    useEffect(() => {
      if (isTimingLive) {
        if (startTimeRef.current === null) {
          startTimeRef.current = Date.now()
        }

        const tick = () => {
          if (startTimeRef.current !== null) {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / MS_IN_S)
            setDuration(Math.max(1, elapsed))
          }
        }

        tick()
        const id = setInterval(tick, MS_IN_S)
        return () => clearInterval(id)
      }

      if (shouldSeal && startTimeRef.current !== null) {
        setDuration(Math.ceil((Date.now() - startTimeRef.current) / MS_IN_S))
        startTimeRef.current = null
      }
    }, [isTimingLive, shouldSeal, setDuration])

    // full : déplié pendant les tokens ; replié automatiquement à la fin
    useEffect(() => {
      if (displayMode !== 'full' || isExplicitlyClosed) {
        prevReasoningActiveRef.current = isReasoningActive
        return
      }

      if (isReasoningActive && !prevReasoningActiveRef.current) {
        setIsOpen(true)
      } else if (!isReasoningActive && prevReasoningActiveRef.current) {
        setIsOpen(false)
      }

      prevReasoningActiveRef.current = isReasoningActive
    }, [displayMode, isReasoningActive, isExplicitlyClosed, setIsOpen])

    const handleOpenChange = useCallback(
      (newOpen: boolean) => {
        setIsOpen(newOpen)
      },
      [setIsOpen]
    )

    const contextValue = useMemo(
      () => ({ duration, isOpen, isStreaming, setIsOpen }),
      [duration, isOpen, isStreaming, setIsOpen]
    )

    return (
      <ReasoningContext.Provider value={contextValue}>
        <Collapsible
          className={cn('not-prose mb-4', className)}
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

const triggerTextClass = 'reasoning-trigger m-0'

const defaultGetThinkingMessage = (duration?: number) =>
  formatThinkingMessage(triggerTextClass, duration)

export const ReasoningTrigger = memo(
  ({
    className,
    children,
    getThinkingMessage = defaultGetThinkingMessage,
    ...props
  }: ReasoningTriggerProps) => {
    const { isOpen, duration } = useReasoning()

    return (
      <CollapsibleTrigger
        className={cn(
          'reasoning-trigger flex w-full items-center gap-1.5 transition-opacity',
          className
        )}
        {...props}
      >
        {children ?? (
          <>
            <BrainIcon className="text-muted-foreground size-4 shrink-0" />
            {getThinkingMessage(duration)}
            <ChevronDownIcon
              className={cn(
                'size-3 shrink-0 text-muted-foreground transition-transform',
                isOpen ? 'rotate-180' : 'rotate-0'
              )}
            />
          </>
        )}
      </CollapsibleTrigger>
    )
  }
)

export type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
  children: string
}

const streamdownPlugins = { cjk, code, math, mermaid }

export const ReasoningContent = memo(({ className, children, ...props }: ReasoningContentProps) => (
  <CollapsibleContent
    className={cn(
      'mt-4 text-sm',
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className
    )}
    {...props}
  >
    <Streamdown plugins={streamdownPlugins}>{children}</Streamdown>
  </CollapsibleContent>
))

Reasoning.displayName = 'Reasoning'
ReasoningTrigger.displayName = 'ReasoningTrigger'
ReasoningContent.displayName = 'ReasoningContent'
