import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'

import { useAgentIdentity } from '@/contexts/AgentIdentityContext'
import { OrgUserListItem } from '@/shared/components/OrgUserListItem'
import { AgentAvatar } from '@/shared/components/timeline/timeline-actor-avatar'
import { Command, CommandGroup, CommandItem, CommandList } from '@/shared/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Textarea } from '@/shared/components/ui/textarea'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import { cn } from '@/shared/lib/utils'

import {
  filterMentionSuggestions,
  getMentionTriggerAtCaret,
  insertMentionAt,
  type MentionTrigger
} from '../lib/repayment-mention'

interface Props {
  id?: string
  'aria-label'?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  rows?: number
  disabled?: boolean
  /** Server URL — falls back to settings when omitted. */
  url?: string
}

export function RepaymentMentionTextarea({
  id,
  'aria-label': ariaLabel,
  value,
  onChange,
  placeholder,
  className,
  rows = 3,
  disabled,
  url
}: Props) {
  const listboxId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [trigger, setTrigger] = useState<MentionTrigger | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const { users: orgUsers, loading: usersLoading } = useOrgUsers(url)
  const agent = useAgentIdentity()

  const suggestions = trigger ? filterMentionSuggestions(orgUsers, trigger.query, agent) : []
  // Keep the popover open while @ is active so empty/loading states are visible.
  const open = trigger !== null

  const syncTrigger = useCallback((text: string, caret: number) => {
    setTrigger(getMentionTriggerAtCaret(text, caret))
    setActiveIndex(0)
  }, [])

  const handleChange = (next: string) => {
    onChange(next)
    const caret = textareaRef.current?.selectionStart ?? next.length
    syncTrigger(next, caret)
  }

  const selectMention = useCallback(
    (handle: string) => {
      if (!trigger || !textareaRef.current) return
      const caret = textareaRef.current.selectionStart ?? value.length
      const { nextText, nextCaret } = insertMentionAt(value, trigger, handle, caret)
      onChange(nextText)
      setTrigger(null)
      requestAnimationFrame(() => {
        const el = textareaRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(nextCaret, nextCaret)
      })
    },
    [onChange, trigger, value]
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!trigger) return

    if (event.key === 'Escape') {
      event.preventDefault()
      setTrigger(null)
      return
    }

    if (suggestions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % suggestions.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
      return
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      const suggestion = suggestions[activeIndex]
      if (suggestion) {
        selectMention(suggestion.kind === 'agent' ? suggestion.handle : suggestion.user.login)
      }
    }
  }

  useEffect(() => {
    if (!open) return
    const item = listRef.current?.querySelector<HTMLElement>(
      `[data-mention-index="${activeIndex}"]`
    )
    item?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setTrigger(null)
      }}
      modal={false}
    >
      {/* Ancre de positionnement : la liste s'aligne sur la zone de saisie. */}
      <div className="relative">
        <PopoverTrigger
          render={<span />}
          nativeButton={false}
          aria-hidden
          tabIndex={-1}
          className="pointer-events-none absolute inset-0"
        />
        <Textarea
          id={id}
          ref={textareaRef}
          role="combobox"
          aria-label={ariaLabel}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && suggestions[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined
          }
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          rows={rows}
          className={cn('resize-none', className)}
          onChange={(event) => handleChange(event.target.value)}
          onClick={(event) => {
            const target = event.currentTarget
            syncTrigger(target.value, target.selectionStart ?? 0)
          }}
          onKeyUp={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            const target = event.currentTarget
            syncTrigger(target.value, target.selectionStart ?? 0)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            window.setTimeout(() => setTrigger(null), 120)
          }}
        />
      </div>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        initialFocus={false}
        finalFocus={textareaRef}
        className="w-(--anchor-width) p-0"
        onMouseDown={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList
            id={listboxId}
            ref={listRef}
            role="listbox"
            aria-label="Mentionner un collègue"
          >
            {suggestions.length === 0 && !usersLoading ? (
              <p className="text-muted-foreground px-2.5 py-2 text-xs">
                Aucun collaborateur trouvé.
              </p>
            ) : (
              <>
                <CommandGroup>
                  {suggestions.map((suggestion, index) => {
                    const handle =
                      suggestion.kind === 'agent' ? suggestion.handle : suggestion.user.login
                    return (
                      <CommandItem
                        id={`${listboxId}-option-${index}`}
                        key={suggestion.kind === 'agent' ? `agent:${handle}` : `user:${handle}`}
                        value={handle}
                        data-mention-index={index}
                        aria-selected={index === activeIndex}
                        className={cn(index === activeIndex && 'bg-muted text-foreground')}
                        onMouseEnter={() => setActiveIndex(index)}
                        onSelect={() => selectMention(handle)}
                      >
                        {suggestion.kind === 'agent' ? (
                          <span className="flex min-w-0 items-center gap-2">
                            <AgentAvatar size="sm" />
                            <span className="flex min-w-0 flex-col items-start">
                              <span className="truncate font-medium">{suggestion.name}</span>
                              <span className="text-muted-foreground truncate text-xs">
                                {suggestion.handle}
                              </span>
                            </span>
                          </span>
                        ) : (
                          <OrgUserListItem user={suggestion.user} />
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
                {usersLoading ? (
                  <p className="text-muted-foreground px-2.5 py-2 text-xs">
                    Chargement des collaborateurs…
                  </p>
                ) : null}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
