import { ArrowUpIcon, SquareIcon } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'

import { isChatGenerating, type ChatStatus } from '@/features/chat/lib/chat-session-types'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea
} from '@/shared/components/ui/input-group'
import type { ChatBootData } from '@/shared/types'

import { ProfileSelector } from './ProfileSelector'

interface Props {
  boot: ChatBootData
  status: ChatStatus
  agentName: string
  onSend: (text: string) => void
  onStop: () => void
  onProfileSelect: (id: string) => void
}

export function ChatComposer({ boot, status, agentName, onSend, onStop, onProfileSelect }: Props) {
  const [draft, setDraft] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  const generating = isChatGenerating(status)
  const canSend = draft.trim().length > 0 && !generating

  function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const text = draft.trim()
    if (!text || generating) return
    onSend(text)
    setDraft('')
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !isComposing &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form className="w-full" aria-busy={generating} onSubmit={handleSubmit}>
      <InputGroup className="has-disabled:bg-transparent has-disabled:opacity-100">
        <InputGroupTextarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          aria-label="Message"
          placeholder="Envoyer un message…"
          className="max-h-36 min-h-10 px-3 py-2"
        />
        <InputGroupAddon align="block-end" className="px-2 py-1 pb-1.5">
          {boot.displayableConfigs.length > 0 ? (
            <ProfileSelector
              configs={boot.displayableConfigs}
              activeId={boot.configId}
              agentName={agentName}
              onSelect={onProfileSelect}
              disabled={generating}
            />
          ) : null}
          {generating ? (
            <InputGroupButton
              type="button"
              variant="outline"
              size="icon-sm"
              className="ms-auto"
              aria-label="Arrêter"
              onClick={onStop}
            >
              <SquareIcon />
              <span className="sr-only">Arrêter</span>
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              variant="default"
              size="icon-sm"
              className="ms-auto"
              aria-label="Envoyer"
              disabled={!canSend}
            >
              <ArrowUpIcon />
              <span className="sr-only">Envoyer</span>
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
