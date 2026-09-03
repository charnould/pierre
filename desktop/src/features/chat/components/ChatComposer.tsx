import { ArrowUpIcon, PaperclipIcon, SquareIcon } from 'lucide-react'
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode
} from 'react'

import { ChatAttachmentItems } from '@/features/chat/components/ChatAttachmentItems'
import { isChatGenerating, type ChatStatus } from '@/features/chat/lib/chat-session-types'
import { FieldError } from '@/shared/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea
} from '@/shared/components/ui/input-group'
import { cn } from '@/shared/lib/utils'

import { ATTACHMENT_SUPPORTED_EXTENSIONS } from '../../../../../shared/attachment-extensions'

const ACCEPT = [...ATTACHMENT_SUPPORTED_EXTENSIONS].map((extension) => `.${extension}`).join(',')

export const CHAT_COMPOSER_PLACEHOLDER = "Comment puis-je vous aider aujourd'hui ?"

export type ChatComposerHandle = {
  focus: () => void
}

interface Props {
  status: ChatStatus
  files: File[]
  previewUrls: Array<string | undefined>
  fileErrors: string[]
  dropActive: boolean
  allowAttachments?: boolean
  autoFocus?: boolean
  composerAccessory?: ReactNode
  placeholder?: string
  onSend: (text: string, files?: File[]) => void
  onAddFiles?: (files: File[]) => void
  onRemoveFile: (index: number) => void
  onFilesSent: () => void
  onStop: () => void
}

export const ChatComposer = forwardRef<ChatComposerHandle, Props>(function ChatComposer(
  {
    status,
    files,
    previewUrls,
    fileErrors,
    dropActive,
    allowAttachments = false,
    autoFocus = false,
    composerAccessory,
    placeholder = CHAT_COMPOSER_PLACEHOLDER,
    onSend,
    onAddFiles,
    onRemoveFile,
    onFilesSent,
    onStop
  },
  ref
) {
  const [draft, setDraft] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus()
  }))

  const generating = isChatGenerating(status)
  const canSend = (draft.trim().length > 0 || files.length > 0) && !generating

  function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    const text = draft.trim()
    if ((!text && files.length === 0) || generating) return
    onSend(text, files)
    setDraft('')
    onFilesSent()
    textareaRef.current?.focus()
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

  function handlePickFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? [])
    if (picked.length > 0) onAddFiles?.(picked)
    event.target.value = ''
  }

  return (
    <form className="w-full" aria-busy={generating} onSubmit={handleSubmit}>
      <InputGroup
        data-drop-active={dropActive}
        className={cn(
          'h-auto flex-col items-stretch rounded-xl shadow-sm has-disabled:bg-transparent has-disabled:opacity-100',
          'has-[[data-slot=input-group-control]:focus-visible]:border-foreground/30',
          'has-[[data-slot=input-group-control]:focus-visible]:ring-0',
          dropActive && 'border-ring ring-1 ring-ring/30'
        )}
      >
        {files.length > 0 || fileErrors.length > 0 ? (
          <InputGroupAddon align="block-start" className="flex-col items-stretch px-2">
            <ChatAttachmentItems
              layout="chip"
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
        {allowAttachments ? (
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={handlePickFiles}
          />
        ) : null}
        <InputGroupTextarea
          ref={textareaRef}
          autoFocus={autoFocus}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          aria-label="Message"
          aria-describedby={fileErrors.length > 0 ? 'chat-attachment-errors' : undefined}
          placeholder={placeholder}
          data-example-preview={placeholder !== CHAT_COMPOSER_PLACEHOLDER ? '' : undefined}
          rows={3}
          className="block max-h-36 min-h-0 w-full flex-none px-3 pt-2.5 pb-1 text-start leading-5"
        />
        <div
          className={cn(
            'flex h-10 w-full shrink-0 items-center gap-1 px-1.5',
            composerAccessory ? 'justify-between' : 'justify-end'
          )}
        >
          {composerAccessory ? (
            <div
              className={cn(
                'flex min-w-0 items-center',
                generating && 'pointer-events-none opacity-50'
              )}
            >
              {composerAccessory}
            </div>
          ) : null}
          <div className="flex shrink-0 items-center gap-1">
            {allowAttachments ? (
              <InputGroupButton
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Joindre un fichier"
                className="text-muted-foreground"
                disabled={generating}
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon />
                <span className="sr-only">Joindre un fichier</span>
              </InputGroupButton>
            ) : null}
            {generating ? (
              <InputGroupButton
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Arrêter"
                onClick={onStop}
              >
                <SquareIcon />
                <span className="sr-only">Arrêter</span>
              </InputGroupButton>
            ) : (
              <InputGroupButton
                type="submit"
                variant={canSend ? 'default' : 'ghost'}
                size="icon-sm"
                aria-label="Envoyer"
                disabled={!canSend}
              >
                <ArrowUpIcon />
                <span className="sr-only">Envoyer</span>
              </InputGroupButton>
            )}
          </div>
        </div>
      </InputGroup>
    </form>
  )
})
