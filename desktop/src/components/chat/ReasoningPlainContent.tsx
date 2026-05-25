import { useLayoutEffect, useRef } from 'react'

import { CollapsibleContent } from '@/components/ui/collapsible'

/** Retire les puces injectées par le serveur (mode full) et aplatit en flux continu. */
export function normalizeReasoningText(raw: string): string {
  return raw
    .replace(/\n\n- /g, ' ')
    .replace(/\n- /g, ' ')
    .replace(/^-\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

interface Props {
  children: string
}

export function ReasoningPlainContent({ children }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const text = normalizeReasoningText(children)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [text])

  return (
    <CollapsibleContent className="reasoning-plain data-[state=closed]:animate-out data-[state=open]:animate-in mt-3 outline-none">
      <div className="reasoning-plain-box">
        <div ref={scrollRef} className="reasoning-plain-scroll">
          <p className="reasoning-plain-text">{text}</p>
        </div>
      </div>
    </CollapsibleContent>
  )
}
