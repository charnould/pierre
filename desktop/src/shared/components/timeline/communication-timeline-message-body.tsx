import { ChevronDown } from 'lucide-react'

import { MentionText } from '@/shared/components/inspector/mention-text'
import { CommunicationDeliveryLine } from '@/shared/components/timeline/communication-delivery-line'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/shared/components/ui/collapsible'
import { formatInspectorTimelineDateline } from '@/shared/lib/timeline/activity-notification-date'
import { parseTimelineMessageBody } from '@/shared/lib/timeline/parse-timeline-message-body'
import { cn } from '@/shared/lib/utils'
import { activity_payload, type Activite } from '@/shared/types/activites'

interface Props {
  row: Activite
  className?: string
}

export function CommunicationTimelineMessageBody({ row, className }: Props) {
  const parsed = parseTimelineMessageBody(row)
  const receptionInitiale = activity_payload(row.type, row.contenu)['reception_initiale'] === true

  if (parsed?.kind === 'rcs') {
    return (
      <div
        className={cn(
          'border-border bg-card flex flex-col gap-1.5 rounded-md border px-2.5 py-2',
          className
        )}
      >
        <div>
          <p className="text-muted-foreground m-0 text-[0.6875rem] leading-4 font-medium">
            Corps du RCS
          </p>
          <MentionText
            text={parsed.text}
            className="text-foreground m-0 mt-0.5 font-sans text-xs leading-4 [text-wrap:pretty] break-words whitespace-pre-wrap"
          />
          {parsed.choices.length ? (
            <p className="text-muted-foreground m-0 mt-1 text-[0.6875rem] leading-4">
              Choix proposés : {parsed.choices.join(' · ')}
            </p>
          ) : null}
        </div>
        <CommunicationDeliveryLine row={row} />
      </div>
    )
  }

  if (parsed?.kind === 'email') {
    const body = parsed.body.trim()
    return (
      <div
        className={cn(
          'border-border bg-card flex flex-col gap-1.5 rounded-md border px-2.5 py-2',
          className
        )}
      >
        {parsed.subject ? (
          <div>
            <p className="text-muted-foreground m-0 text-[0.6875rem] leading-4 font-medium">
              {parsed.medium === 'email' ? 'Objet' : 'Document'}
            </p>
            <p className="text-foreground m-0 mt-0.5 font-sans text-xs leading-4 font-semibold [text-wrap:balance] break-words whitespace-pre-wrap">
              {parsed.subject}
            </p>
          </div>
        ) : null}
        {body ? (
          <Collapsible defaultOpen={receptionInitiale}>
            <CollapsibleTrigger className="text-muted-foreground flex w-fit items-center gap-1 text-[0.6875rem] leading-4 font-medium">
              Corps du message
              <ChevronDown className="size-3 transition-transform in-data-[panel-open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="outline-none">
              <MentionText
                text={parsed.body}
                className="text-foreground m-0 mt-0.5 font-sans text-xs leading-4 [text-wrap:pretty] break-words whitespace-pre-wrap"
              />
            </CollapsibleContent>
          </Collapsible>
        ) : null}
        {parsed.from || parsed.to || parsed.sentAt ? (
          <p className="text-muted-foreground m-0 text-[0.6875rem] leading-4">
            {[
              parsed.from ? `De ${parsed.from}` : null,
              parsed.to ? `À ${parsed.to}` : null,
              parsed.sentAt ? `Envoyé le ${formatInspectorTimelineDateline(parsed.sentAt)}` : null
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : receptionInitiale ? null : (
          <CommunicationDeliveryLine row={row} />
        )}
      </div>
    )
  }

  return null
}
