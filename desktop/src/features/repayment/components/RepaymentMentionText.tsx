import { useAgentIdentity } from '@/contexts/AgentIdentityContext'
import { cn } from '@/shared/lib/utils'

import { isDesktopAgentIdentity } from '../../../../../shared/agent-identity'
import { formatMentionDisplay, splitTextWithMentions } from '../lib/repayment-mention'
import { CollaboratorChip } from './CollaboratorChip'

function loginKey(raw: string): string {
  const lower = raw.trim().toLowerCase()
  const at = lower.indexOf('@')
  return (at > 0 ? lower.slice(0, at) : lower).trim()
}

interface Props {
  text: string
  className?: string
  /** Rendu en span pour flux inline (ex. signature activité). */
  inline?: boolean
  /** badge = pill neutre · inline = lien · activity = mentions récepteur en pill neutre · activityRecipient = pill jaune abeille */
  mentionVariant?: 'badge' | 'inline' | 'activity' | 'activityRecipient'
  /** Chips h-4 — rail notifications. */
  compact?: boolean
  /** Logins / emails à ne pas chipper (ex. auto-mention = expéditeur). */
  omitLogins?: readonly string[]
}

export function RepaymentMentionText({
  text,
  className,
  inline = false,
  mentionVariant = 'badge',
  compact = false,
  omitLogins = []
}: Props) {
  const agent = useAgentIdentity()
  const parts = splitTextWithMentions(text)
  const Tag = inline ? 'span' : 'p'
  const omitted = new Set(omitLogins.map(loginKey).filter(Boolean))

  return (
    <Tag
      className={cn(
        inline ? undefined : 'text-xs leading-relaxed [text-wrap:balance]',
        mentionVariant !== 'activity' &&
          mentionVariant !== 'activityRecipient' &&
          !inline &&
          'text-muted-foreground',
        className
      )}
    >
      {parts.map((part, index) => {
        if (part.type === 'mention' && omitted.has(loginKey(part.value))) return null
        if (part.type === 'mention') {
          const name = isDesktopAgentIdentity(part.value, agent.name)
            ? agent.name
            : formatMentionDisplay(part.value)
          return mentionVariant === 'inline' ? (
            <span
              key={`${part.value}-${index}`}
              className="text-primary font-medium whitespace-nowrap"
            >
              {name}
            </span>
          ) : (
            <CollaboratorChip
              key={`${part.value}-${index}`}
              identity={part.value}
              compact={compact}
              className={
                mentionVariant === 'activity' || mentionVariant === 'activityRecipient'
                  ? 'me-0.5 first:ms-0'
                  : 'mx-0.5'
              }
            />
          )
        }
        return <span key={`text-${index}`}>{part.value}</span>
      })}
    </Tag>
  )
}
