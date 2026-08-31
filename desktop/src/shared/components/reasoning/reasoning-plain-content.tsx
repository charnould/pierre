import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

import { Card } from '@/shared/components/ui/card'
import { CollapsibleContent } from '@/shared/components/ui/collapsible'
import { ScrollArea } from '@/shared/components/ui/scroll-area'

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
  embedded?: boolean
  layout?: 'boxed' | 'flat' | 'desk'
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
    <div className={layout === 'desk' ? 'px-4 py-2' : 'px-3.5 py-0.5'}>
      <div className="text-muted-foreground m-0 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
        {text}
      </div>
    </div>
  )

  useEffect(() => {
    if (layout === 'flat' || !isStreaming) return
    const viewport = getScrollViewport(boxRef.current)
    if (!viewport) return
    const mo = new MutationObserver(scrollToBottom)
    mo.observe(viewport, { childList: true, subtree: true, characterData: true })
    scrollToBottom()
    return () => mo.disconnect()
  }, [layout, isStreaming, scrollToBottom])

  useLayoutEffect(() => {
    if (layout === 'flat' || !isStreaming) return
    scrollToBottom()
  }, [layout, text, isStreaming, scrollToBottom])

  if (layout === 'flat') {
    const flat = <div className="relative z-10 outline-none">{streamText}</div>
    return embedded ? (
      flat
    ) : (
      <CollapsibleContent className="data-open:animate-in data-closed:animate-out outline-none">
        {flat}
      </CollapsibleContent>
    )
  }

  if (layout === 'desk') {
    const deskBox = (
      <Card ref={boxRef} size="sm">
        <ScrollArea className="h-48 overscroll-contain">{streamText}</ScrollArea>
      </Card>
    )

    if (embedded) {
      return <div className="outline-none">{deskBox}</div>
    }

    return (
      <CollapsibleContent className="data-open:animate-in data-closed:animate-out outline-none">
        {deskBox}
      </CollapsibleContent>
    )
  }

  const box = (
    <Card ref={boxRef} size="sm">
      <ScrollArea className="h-24">{streamText}</ScrollArea>
    </Card>
  )

  if (embedded) {
    return <div className="mt-2 outline-none">{box}</div>
  }

  return (
    <CollapsibleContent className="data-open:animate-in data-closed:animate-out mt-2 outline-none">
      {box}
    </CollapsibleContent>
  )
}
