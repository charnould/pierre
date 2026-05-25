import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

import { FluidStreamText } from '@/shared/components/FluidStreamText'
import { CollapsibleContent } from '@/shared/components/ui/collapsible'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { cn } from '@/shared/lib/utils'

const REASONING_PLAIN_BOX_CLASS = cn(
  'reasoning-plain-box h-[var(--workflow-reasoning-expanded-height)] overflow-hidden rounded-lg border border-border-soft bg-muted/18 py-2',
  '[&_[data-slot=scroll-area]]:h-full'
)

const REASONING_PLAIN_TEXT_CLASS = cn(
  'reasoning-plain-text m-0 font-mono text-[length:var(--workflow-reasoning-font-size)] leading-[var(--workflow-reasoning-line-height)] font-normal text-muted-foreground whitespace-pre-wrap break-words'
)

/** Retire les puces injectées par le serveur (mode full) en les aplatissant inline, tout en préservant les sauts de ligne. */
export function normalizeReasoningText(raw: string): string {
  return raw
    .replace(/\n\n- /g, ' ')
    .replace(/\n- /g, ' ')
    .replace(/^-\s+/gm, '')
    .replace(/^[ \t]+/gm, '')
    .replace(/^\s+$/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function getScrollViewport(container: HTMLElement | null): HTMLElement | null {
  return container?.querySelector('[data-slot="scroll-area-viewport"]') ?? null
}

interface Props {
  children: string
  isStreaming?: boolean
  /** When true, skip CollapsibleContent (parent controls visibility). */
  embedded?: boolean
  /** `boxed` = internal scroll (chat, accordion). `flat` = parent scroll (workflow stream). */
  layout?: 'boxed' | 'flat'
}

export function ReasoningPlainContent({
  children,
  isStreaming = false,
  embedded = false,
  layout = 'boxed'
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null)
  const text = normalizeReasoningText(children)

  const scrollToBottom = useCallback(() => {
    const viewport = getScrollViewport(boxRef.current)
    if (!viewport) return
    viewport.scrollTop = viewport.scrollHeight
  }, [])

  const streamText = (
    <div className="reasoning-plain-body px-3.5 py-0.5">
      <FluidStreamText
        text={text}
        isStreaming={isStreaming}
        unit="word"
        as="div"
        className={REASONING_PLAIN_TEXT_CLASS}
      />
    </div>
  )

  // During streaming, follow new tokens inside the fixed-height scroll area (boxed layout only).
  useEffect(() => {
    if (layout === 'flat') return
    const viewport = getScrollViewport(boxRef.current)
    if (!viewport || !isStreaming) return
    const mo = new MutationObserver(scrollToBottom)
    mo.observe(viewport, { childList: true, subtree: true, characterData: true })
    scrollToBottom()
    return () => mo.disconnect()
  }, [layout, isStreaming, scrollToBottom])

  useLayoutEffect(() => {
    if (layout === 'flat') return
    scrollToBottom()
  }, [layout, text, isStreaming, scrollToBottom])

  if (layout === 'flat') {
    const flat = (
      <div className="reasoning-plain reasoning-plain--flat relative z-10 outline-none">
        {streamText}
      </div>
    )
    return embedded ? (
      flat
    ) : (
      <CollapsibleContent className="data-[state=closed]:animate-out data-[state=open]:animate-in outline-none">
        {flat}
      </CollapsibleContent>
    )
  }

  const box = (
    <div ref={boxRef} className={REASONING_PLAIN_BOX_CLASS}>
      <ScrollArea className="size-full">{streamText}</ScrollArea>
    </div>
  )

  if (embedded) {
    return <div className="reasoning-plain mt-2 outline-none">{box}</div>
  }

  return (
    <CollapsibleContent className="reasoning-plain data-[state=closed]:animate-out data-[state=open]:animate-in mt-2 outline-none">
      {box}
    </CollapsibleContent>
  )
}
