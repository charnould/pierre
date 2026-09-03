import {
  AlignLeft,
  AtSign,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  FileText,
  Reply,
  TextQuote,
  UserRound,
  type LucideIcon
} from 'lucide-react'
import { Fragment, useId, useState, type KeyboardEvent, type MouseEvent } from 'react'

import { MentionText } from '@/shared/components/inspector/mention-text'
import { Badge } from '@/shared/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { formatInspectorTimelineDateline } from '@/shared/lib/timeline/activity-notification-date'
import {
  communicationBodyParagraphs,
  displayTimelineCommunicationBody,
  parseTimelineCommunication,
  previewTimelineCommunicationParagraphs
} from '@/shared/lib/timeline/timeline-communication'
import { cn } from '@/shared/lib/utils'
import type { Activite } from '@/shared/types/activites'

const VALUE = 'text-foreground m-0 min-w-0 text-xs leading-4'

const META_ICONS: Record<string, LucideIcon> = {
  De: UserRound,
  À: AtSign,
  'Envoyé le': Clock,
  Objet: TextQuote,
  Document: FileText,
  Statut: CircleCheck,
  Corps: AlignLeft,
  'Choix proposés': Reply
}

export function TimelineCommunicationEnvelope({
  row,
  statuses = [],
  expandable
}: {
  row: Activite
  statuses?: Activite[]
  expandable: boolean
}) {
  const parsed = parseTimelineCommunication(row, statuses)
  const [expanded, setExpanded] = useState(false)
  const bodyId = useId()
  if (!parsed) return null

  const allParagraphs = communicationBodyParagraphs(
    displayTimelineCommunicationBody(parsed.body, parsed.subject)
  )
  const preview = previewTimelineCommunicationParagraphs(allParagraphs)
  const paragraphs = expanded || !preview.truncated ? allParagraphs : preview.paragraphs
  const canToggle = expandable && preview.truncated
  const showStaticEllipsis = !expandable && preview.truncated
  const metas: { label: string; value: string; truncate?: boolean }[] = []
  if (parsed.from) metas.push({ label: 'De', value: parsed.from })
  if (parsed.to) metas.push({ label: 'À', value: parsed.to })
  if (parsed.sentAt) {
    metas.push({ label: 'Envoyé le', value: formatInspectorTimelineDateline(parsed.sentAt) })
  }
  if (parsed.subject) {
    metas.push({ label: parsed.subjectLabel, value: parsed.subject, truncate: true })
  }
  if (parsed.statusLine) metas.push({ label: 'Statut', value: parsed.statusLine })

  if (metas.length === 0 && paragraphs.length === 0 && parsed.choices.length === 0) return null

  return (
    <div data-slot="timeline-communication" className="border-border/60 rounded-md border p-2.5">
      <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] items-start gap-x-2 gap-y-1">
        {metas.map((meta) => (
          <Fragment key={meta.label}>
            <MetaLabel label={meta.label} />
            <dd
              className={cn(
                VALUE,
                meta.truncate ? 'truncate' : 'break-words whitespace-pre-wrap',
                meta.label === 'Statut' && parsed.statusFailed && 'text-destructive'
              )}
              title={meta.truncate ? meta.value : undefined}
            >
              {meta.value}
            </dd>
          </Fragment>
        ))}
        {paragraphs.length > 0 ? (
          <>
            <MetaLabel label="Corps" />
            <dd id={canToggle ? bodyId : undefined} className="m-0 flex min-w-0 flex-col gap-1">
              {paragraphs.map((paragraph, index) => {
                const last = index === paragraphs.length - 1
                return (
                  <p key={index} className={cn(VALUE, 'text-pretty break-words')}>
                    <MentionText text={paragraph} inline className="text-pretty" />
                    {last && showStaticEllipsis ? '…' : null}
                    {last && canToggle ? (
                      <DisclosureToggle
                        expanded={expanded}
                        bodyId={bodyId}
                        onToggle={() => setExpanded((open) => !open)}
                      />
                    ) : null}
                  </p>
                )
              })}
            </dd>
          </>
        ) : null}
        {parsed.choices.length > 0 ? (
          <>
            <MetaLabel label="Choix proposés" />
            <dd className="m-0 min-w-0">
              <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
                {parsed.choices.map((choice) => (
                  <li key={choice} className="m-0 min-w-0">
                    <Badge variant="secondary" size="compact">
                      {choice}
                    </Badge>
                  </li>
                ))}
              </ul>
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  )
}

function MetaLabel({ label }: { label: string }) {
  const Icon = META_ICONS[label] ?? AlignLeft
  return (
    <dt className="text-muted-foreground m-0 flex h-4 w-4 items-center justify-center">
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="focus-visible:ring-ring/40 inline-flex size-4 items-center justify-center rounded-sm outline-none focus-visible:ring-1" />
          }
        >
          <Icon aria-hidden className="size-3.5" strokeWidth={1.5} />
          <span className="sr-only">{label}</span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </dt>
  )
}

function DisclosureToggle({
  expanded,
  bodyId,
  onToggle
}: {
  expanded: boolean
  bodyId: string
  onToggle: () => void
}) {
  const label = expanded ? 'Réduire' : 'Afficher la suite'
  const Icon = expanded ? ChevronUp : ChevronDown

  function isolate(event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>) {
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return
    event.stopPropagation()
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground focus-visible:ring-ring/40 ms-0.5 inline-flex size-[1em] shrink-0 items-center justify-center align-middle outline-none focus-visible:ring-1"
            aria-label={label}
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={(event) => {
              isolate(event)
              onToggle()
            }}
            onKeyDown={isolate}
          />
        }
      >
        <Icon aria-hidden className="size-full" />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
