import type { ReactNode } from 'react'

import { MentionText } from '@/shared/components/inspector/mention-text'
import { Badge } from '@/shared/components/ui/badge'
import { communicationBodyParagraphs } from '@/shared/lib/timeline/timeline-communication'
import { cn } from '@/shared/lib/utils'
import type { ActivityValue } from '@/shared/types/activites'

export function formatActivityValue(value: ActivityValue): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value || '—'
  if (Array.isArray(value)) {
    if (value.length === 0) return 'Aucun'
    return value.map((entry) => (typeof entry === 'string' ? entry : entry.label)).join(', ')
  }
  return value.label
}

export function TimelineQuote({ children }: { children: string }) {
  const paragraphs = communicationBodyParagraphs(children)
  if (paragraphs.length === 0) return null
  return (
    <blockquote className="border-border/60 text-foreground mt-2 flex flex-col gap-1 border-l ps-2 text-xs leading-4">
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-pretty">
          <MentionText text={paragraph} inline />
        </p>
      ))}
    </blockquote>
  )
}

export function TimelineObject({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-border/60 mt-2 rounded-md border p-2 text-xs leading-4">
      <p className="truncate font-medium" title={title}>
        {title}
      </p>
      {children}
    </div>
  )
}

export function TimelineDelta({
  before,
  after,
  note,
  failed
}: {
  before: ActivityValue
  after: ActivityValue
  note?: string
  failed?: boolean
}) {
  const collection = Array.isArray(before) || Array.isArray(after)
  return (
    <div className="mt-2 flex flex-col gap-2">
      {collection ? (
        <div className="grid grid-cols-2 gap-2 text-xs leading-4">
          <div>
            <p className="text-muted-foreground">Avant</p>
            <p className="text-pretty break-words">{formatActivityValue(before)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Après</p>
            <p className={cn('text-pretty break-words', failed && 'text-destructive')}>
              {formatActivityValue(after)}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs leading-4">
          <span className="text-muted-foreground">{formatActivityValue(before)}</span>
          <span className="text-muted-foreground"> → </span>
          <span className={cn(failed && 'text-destructive')}>{formatActivityValue(after)}</span>
        </p>
      )}
      {note ? <TimelineQuote>{note}</TimelineQuote> : null}
    </div>
  )
}

export function TimelineFact({
  label,
  value,
  failed
}: {
  label: string
  value: ReactNode
  failed?: boolean
}) {
  return (
    <p className="mt-2 text-xs leading-4">
      <span className="text-muted-foreground">{label} </span>
      <span className={cn('text-foreground tabular-nums', failed && 'text-destructive')}>
        {value}
      </span>
    </p>
  )
}

export function TimelineChips({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="text-muted-foreground">Aucun tag</span>
  }
  return (
    <span className="flex flex-wrap gap-1">
      {values.map((value) => (
        <Badge
          key={value}
          variant="outline"
          size="compact"
          className="pierre-type-table-header font-normal"
        >
          {value}
        </Badge>
      ))}
    </span>
  )
}
