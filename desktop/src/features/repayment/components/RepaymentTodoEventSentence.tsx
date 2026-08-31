import { Calendar } from 'lucide-react'

import { Badge } from '@/shared/components/ui/badge'

import { formatDebutBailDisplay } from '../lib/format-debut-bail'
import type { TodoSentencePart } from '../lib/repayment-action-activity'
import { CollaboratorChip } from './CollaboratorChip'

function TitleChip({ text }: { text: string }) {
  return (
    <Badge variant="secondary" className="h-4 max-w-full px-1.5 py-0 leading-none font-normal">
      <span className="truncate">{text}</span>
    </Badge>
  )
}

function DateChip({ iso }: { iso: string }) {
  const label = formatDebutBailDisplay(iso) ?? iso
  return (
    <Badge variant="secondary" className="h-4 gap-1 px-1.5 py-0 font-normal tabular-nums">
      <Calendar aria-hidden className="size-3" />
      {label}
    </Badge>
  )
}

export function RepaymentTodoEventSentence({ parts }: { parts: TodoSentencePart[] }) {
  return (
    <span className="contents font-normal">
      {parts.map((part, index) => {
        if (part.type === 'text') {
          return <span key={`text-${index}`}>{part.text}</span>
        }
        if (part.type === 'title') {
          return <TitleChip key={`title-${index}`} text={part.text} />
        }
        if (part.type === 'person') {
          return <CollaboratorChip key={`person-${index}`} identity={part.identity} compact />
        }
        return <DateChip key={`date-${index}`} iso={part.iso} />
      })}
    </span>
  )
}
