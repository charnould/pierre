import { Loader2, Square, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useCallback, useState, type ChangeEvent } from 'react'

import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage
} from '@/features/chat/components/ai/prompt-input'
import type { ChatStatus } from '@/features/chat/hooks/use-chat-session'
import { InputGroupAddon } from '@/shared/components/ui/input-group'
import { cn } from '@/shared/lib/utils'
import type { ChatBootData } from '@/shared/types'

import {
  CHAT_COMPOSER_GENERATING_CLASS,
  CHAT_COMPOSER_INPUT_GROUP_CLASS,
  CHAT_COMPOSER_SUBMIT_CLASS,
  CHAT_COMPOSER_SURFACE_CLASS,
  CHAT_COMPOSER_TEXTAREA_CLASS,
  CHAT_COMPOSER_TOOLBAR_CLASS,
  chatComposerSubmitToneClass,
  isChatGenerating
} from './chat-utils'
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
    return <Loader2 className="size-4 animate-spin" strokeWidth={2} />
  }
  if (status === 'streaming') {
    return <Square className="size-3.5 fill-current" strokeWidth={0} />
  }
  if (status === 'error') {
    return <X className="size-4" strokeWidth={2} />
  }
  return <SendPaperPlaneIcon className="size-4" />
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
  const submitActive = canSend || generating

  return (
    <motion.div layout className="relative">
      <div
        className={cn(CHAT_COMPOSER_SURFACE_CLASS, generating && CHAT_COMPOSER_GENERATING_CLASS)}
      >
        <PromptInput onSubmit={handleSubmit} inputGroupClassName={CHAT_COMPOSER_INPUT_GROUP_CLASS}>
          <PromptInputTextarea
            onChange={handleTextChange}
            placeholder="Posez votre question…"
            className={CHAT_COMPOSER_TEXTAREA_CLASS}
          />

          <InputGroupAddon align="block-end" className={CHAT_COMPOSER_TOOLBAR_CLASS}>
            <ProfileSelector
              configs={boot.displayableConfigs}
              activeId={boot.configId}
              onSelect={onProfileSelect}
              disabled={generating}
            />

            <PromptInputSubmit
              status={status}
              onStop={onStop}
              disabled={!canSend && !generating}
              className={cn(CHAT_COMPOSER_SUBMIT_CLASS, chatComposerSubmitToneClass(submitActive))}
            >
              <SubmitIcon status={status} />
            </PromptInputSubmit>
          </InputGroupAddon>
        </PromptInput>
      </div>
    </motion.div>
  )
}
