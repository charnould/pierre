import { ArrowUpIcon, SquareIcon } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'

import { ChatAttachmentItems } from '@/features/chat/components/ChatAttachmentItems'
import { isChatGenerating, type ChatStatus } from '@/features/chat/lib/chat-session-types'
import { FieldError } from '@/shared/components/ui/field'
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
  files: File[]
  previewUrls: Array<string | undefined>
  fileErrors: string[]
  dropActive: boolean
  onSend: (text: string, files?: File[]) => void
  onRemoveFile: (index: number) => void
  onFilesSent: () => void
  onStop: () => void
  onProfileSelect: (id: string) => void
}

export function ChatComposer({
  boot,
  status,
  agentName,
  files,
  previewUrls,
  fileErrors,
  dropActive,
  onSend,
  onRemoveFile,
  onFilesSent,
  onStop,
  onProfileSelect
}: Props) {
  const [draft, setDraft] = useState('')
  const [isComposing, setIsComposing] = useState(false)

  const generating = isChatGenerating(status)
  const canSend = (draft.trim().length > 0 || files.length > 0) && !generating

  function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const text = draft.trim()
    if ((!text && files.length === 0) || generating) return
    onSend(text, files)
    setDraft('')
    onFilesSent()
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
      <InputGroup
        data-drop-active={dropActive}
        className="has-disabled:bg-transparent has-disabled:opacity-100"
      >
        {files.length > 0 || fileErrors.length > 0 ? (
          <InputGroupAddon align="block-start" className="flex-col items-stretch px-2">
            <ChatAttachmentItems
              attachments={files}
              previewUrls={previewUrls}
              onRemove={onRemoveFile}
            />
            <FieldError
              id="chat-attachment-errors"
              errors={fileErrors.map((message) => ({ message }))}
            />
          </InputGroupAddon>
        ) : null}
        <InputGroupTextarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          aria-label="Message"
          aria-describedby={fileErrors.length > 0 ? 'chat-attachment-errors' : undefined}
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
