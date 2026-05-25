import { Loader2, Square, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useState, type ChangeEvent } from 'react'

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage
} from '@/components/ai/prompt-input'
import { cn } from '@/lib/utils'

import type { ChatStatus } from '../../hooks/usePierreChat'
import type { ChatBootData } from '../../types'
import { isChatGenerating } from './chatUtils'
import { ProfileSelector } from './ProfileSelector'
import { SendPaperPlaneIcon } from './SendPaperPlaneIcon'

interface Props {
  boot: ChatBootData
  status: ChatStatus
  onSend: (text: string) => void
  onStop: () => void
  onProfileSelect: (id: string) => void
}

function SubmitIcon({ status }: { status: ChatStatus }) {
  if (status === 'submitted') {
    return <Loader2 className="size-[26px] animate-spin" strokeWidth={2} />
  }
  if (status === 'streaming') {
    return <Square className="size-[22px] fill-current" strokeWidth={0} />
  }
  if (status === 'error') {
    return <X className="size-[26px]" strokeWidth={2} />
  }
  return <SendPaperPlaneIcon />
}

export function ChatComposer({ boot, status, onSend, onStop, onProfileSelect }: Props) {
  const [draft, setDraft] = useState('')

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  const handleTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value)
  }, [])

  const generating = isChatGenerating(status)
  const canSend = draft.trim().length > 0 && !generating
  const submitInteractive = canSend || generating

  return (
    <motion.div layout className="relative">
      <PromptInput
        onSubmit={handleSubmit}
        inputGroupClassName={cn(
          'h-auto min-h-0 flex-col items-stretch rounded-xl shadow-sm !opacity-100',
          'has-[>textarea]:h-auto',
          generating && 'composer-generating'
        )}
      >
        <div className="flex w-full flex-col">
          <PromptInputTextarea
            placeholder="Comment puis-je vous aider ?"
            onChange={handleTextChange}
            className="max-h-36 min-h-16 w-full resize-none px-4 pt-4 pb-2 text-sm leading-normal"
          />

          <div className="border-border flex items-center justify-between gap-2 border-t px-4 pt-1.5 pb-2.5">
            <ProfileSelector
              configs={boot.displayableConfigs}
              activeId={boot.configId}
              onSelect={onProfileSelect}
              disabled={generating}
            />

            <motion.div
              className="mb-0.5 shrink-0"
              initial={false}
              whileHover={submitInteractive ? { scale: 1.05 } : undefined}
              whileTap={submitInteractive ? { scale: 0.94 } : undefined}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              <PromptInputSubmit
                status={status}
                onStop={onStop}
                variant="ghost"
                disabled={!canSend && !generating}
                className={cn(
                  '!size-auto h-auto w-auto shrink-0 rounded-none border-0 bg-transparent p-1 shadow-none',
                  'transition-colors duration-200',
                  'hover:bg-transparent',
                  'disabled:pointer-events-none disabled:opacity-100',
                  generating || canSend
                    ? 'text-muted-foreground hover:text-foreground'
                    : 'cursor-not-allowed text-muted-foreground/50 hover:text-muted-foreground/50'
                )}
              >
                <SubmitIcon status={status} />
              </PromptInputSubmit>
            </motion.div>
          </div>
        </div>
      </PromptInput>
    </motion.div>
  )
}
