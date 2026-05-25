import { Sparkles } from 'lucide-react'
import { motion } from 'motion/react'

import type { ChatStatus } from '@/features/chat/hooks/use-chat-session'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

import { isChatGenerating } from './chat-utils'

interface Props {
  examples: string[]
  status: ChatStatus
  onSelect: (text: string) => void
}

export function ChatExamples({ examples, status, onSelect }: Props) {
  if (examples.length === 0) return null

  const disabled = isChatGenerating(status)

  return (
    <section aria-label="Exemples de questions" className="flex flex-col gap-2.5">
      <Badge variant="neutral" size="compact" className="gap-1 tracking-wide uppercase">
        <Sparkles className="size-2.5" aria-hidden />
        Exemples
      </Badge>
      <div className="flex flex-col items-start gap-2">
        {examples.map((example, index) => (
          <motion.div
            key={example}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => onSelect(example)}
              className={cn(
                'border-border-soft bg-card hover:bg-accent h-auto max-w-[min(100%,32rem)] justify-start px-3.5 py-2.5 text-left font-normal whitespace-normal shadow-[var(--elevation-pill-inset)]',
                disabled && 'pointer-events-none cursor-progress opacity-50'
              )}
            >
              {example}
            </Button>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
