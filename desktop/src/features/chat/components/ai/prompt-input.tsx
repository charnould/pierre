'use client'

import type {
  ComponentProps,
  FormEvent,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  MouseEvent
} from 'react'
import { useCallback, useState } from 'react'

import type { ChatStatus } from '@/features/chat/hooks/use-chat-session'
import {
  InputGroup,
  InputGroupButton,
  InputGroupTextarea
} from '@/shared/components/ui/input-group'
import { cn } from '@/shared/lib/utils'

export interface PromptInputMessage {
  text: string
  files: []
}

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit'> & {
  onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void | Promise<void>
  inputGroupClassName?: string
}

/** Minimal chat composer form (text only). */
export function PromptInput({
  className,
  inputGroupClassName,
  onSubmit,
  children,
  ...props
}: PromptInputProps) {
  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (event) => {
      event.preventDefault()
      const formData = new FormData(event.currentTarget)
      const text = (formData.get('message') as string) || ''
      event.currentTarget.reset()
      void onSubmit({ text, files: [] }, event)
    },
    [onSubmit]
  )

  return (
    <form className={cn('w-full', className)} onSubmit={handleSubmit} {...props}>
      <InputGroup className={cn('overflow-hidden', inputGroupClassName)}>{children}</InputGroup>
    </form>
  )
}

export type PromptInputTextareaProps = ComponentProps<typeof InputGroupTextarea>

export function PromptInputTextarea({
  onChange,
  onKeyDown,
  className,
  placeholder = 'What would you like to know?',
  ...props
}: PromptInputTextareaProps) {
  const [isComposing, setIsComposing] = useState(false)

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      onKeyDown?.(e)
      if (e.defaultPrevented) return

      if (e.key === 'Enter') {
        if (isComposing || e.nativeEvent.isComposing) return
        if (e.shiftKey) return
        e.preventDefault()

        const form = e.currentTarget.form
        const submitButton = form?.querySelector(
          'button[type="submit"]'
        ) as HTMLButtonElement | null
        if (submitButton?.disabled) return

        form?.requestSubmit()
      }
    },
    [onKeyDown, isComposing]
  )

  return (
    <InputGroupTextarea
      className={cn('field-sizing-content max-h-48 min-h-16', className)}
      name="message"
      onCompositionEnd={() => setIsComposing(false)}
      onCompositionStart={() => setIsComposing(true)}
      onKeyDown={handleKeyDown}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  )
}

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus
  onStop?: () => void
}

export function PromptInputSubmit({
  className,
  variant = 'ghost',
  size = 'icon-sm',
  status,
  onStop,
  onClick,
  disabled,
  children,
  ...props
}: PromptInputSubmitProps) {
  const isGenerating = status === 'submitted' || status === 'streaming'

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (isGenerating && onStop) {
        e.preventDefault()
        onStop()
        return
      }
      onClick?.(e)
    },
    [isGenerating, onStop, onClick]
  )

  return (
    <InputGroupButton
      aria-label={isGenerating ? 'Stop' : 'Submit'}
      className={cn(className)}
      disabled={disabled}
      onClick={handleClick}
      size={size}
      type={isGenerating && onStop ? 'button' : 'submit'}
      variant={variant}
      {...props}
    >
      {children}
    </InputGroupButton>
  )
}
