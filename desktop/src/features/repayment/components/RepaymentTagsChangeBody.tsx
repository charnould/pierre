import type { Activite } from '@/shared/types/activites'
import { parse_repayment_tag_change_content } from '@/shared/types/activites'

import { canonicalizeRepaymentTags } from '../lib/repayment-tags'
import { RepaymentMentionText } from './RepaymentMentionText'
import { RepaymentTagBadge } from './RepaymentTagBadge'

const SENTENCE_CHIP_CLASS = 'h-4 px-1.5 py-0 leading-none font-normal'

interface Props {
  row: Activite
}

export function RepaymentTagsChangeSentence({ row }: Props) {
  const change = parse_repayment_tag_change_content(row.contenu)
  if (!change) return null
  const tags = canonicalizeRepaymentTags(change.tags)

  return (
    <span className="contents font-normal">
      <span>a mis à jour les tags</span>
      {tags.length === 0 ? (
        <span>Aucun tag</span>
      ) : (
        tags.map((tag) => <RepaymentTagBadge key={tag} tag={tag} className={SENTENCE_CHIP_CLASS} />)
      )}
    </span>
  )
}

export function RepaymentTagsChangeBody({ row }: Props) {
  const change = parse_repayment_tag_change_content(row.contenu)
  const comment = change?.note?.trim() ?? ''
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

export function isRepaymentTagChangeActivity(row: Activite): boolean {
  return (
    row.type === 'repayment_tag_change' && parse_repayment_tag_change_content(row.contenu) != null
  )
}
