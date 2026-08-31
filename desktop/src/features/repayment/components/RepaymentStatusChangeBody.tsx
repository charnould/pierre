import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'
import type { Activite } from '@/shared/types/activites'

import {
  parseRepaymentStatusChange,
  parseRepaymentStatusChangeComment,
  statusChangeTimelineSentence
} from '../lib/repayment-activity-text'
import { CollaboratorChip } from './CollaboratorChip'
import { RepaymentBucketBadge } from './RepaymentBucketBadge'
import { RepaymentMentionText } from './RepaymentMentionText'

const SENTENCE_CHIP_CLASS = 'h-4 px-1.5 py-0 leading-none font-normal'

interface Props {
  row: Activite
  columnValues?: ColumnValuesConfig
}

export function RepaymentStatusChangeSentence({ row, columnValues }: Props) {
  const change = parseRepaymentStatusChange(row)
  if (!change) return null

  return (
    <span className="contents font-normal">
      {statusChangeTimelineSentence(change).map((part, index) => {
        if (part.type === 'text') {
          return <span key={`text-${index}`}>{part.text}</span>
        }
        if (part.type === 'person') {
          return <CollaboratorChip key={`person-${index}`} identity={part.identity} compact />
        }
        return (
          <RepaymentBucketBadge
            key={`bucket-${index}`}
            bucket={part.id}
            columnValues={columnValues}
            className={SENTENCE_CHIP_CLASS}
          />
        )
      })}
    </span>
  )
}

export function RepaymentStatusChangeBody({ row }: { row: Activite }) {
  const comment = parseRepaymentStatusChangeComment(row)
  if (!comment) return null

  return (
    <RepaymentMentionText
      text={comment}
      mentionVariant="activity"
      compact
      className="text-muted-foreground m-0 text-xs leading-4 whitespace-pre-wrap"
    />
  )
}

export function isRepaymentStatusChangeActivity(row: Activite): boolean {
  return parseRepaymentStatusChange(row) != null
}
