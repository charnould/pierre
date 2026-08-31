import { useId, useMemo } from 'react'

import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { SelectItems } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import { REPAYMENT_BUCKET_OPTIONS, type RepaymentBucketId } from '../lib/repayment-bucket'
import { RepaymentBucketBadge } from './RepaymentBucketBadge'
import { RepaymentMentionTextarea } from './RepaymentMentionTextarea'

interface Props {
  bucket: RepaymentBucketId | null
  onBucketChange: (bucket: RepaymentBucketId | null) => void
  comment: string
  onCommentChange: (comment: string) => void
  columnValues?: ColumnValuesConfig
  onCancel: () => void
  onSave: () => void
  canSave: boolean
  saving?: boolean
}

function SelectPlaceholder() {
  return <span className="text-muted-foreground">Sélectionner</span>
}

export function RepaymentTimelineAdvancementDraft({
  bucket,
  onBucketChange,
  comment,
  onCommentChange,
  columnValues,
  onCancel,
  onSave,
  canSave,
  saving = false
}: Props) {
  const phaseId = useId()
  const commentId = useId()
  const phaseItems = useMemo(
    () => [
      { label: <SelectPlaceholder />, value: null },
      ...REPAYMENT_BUCKET_OPTIONS.map((option) => ({
        label: <RepaymentBucketBadge bucket={option.id} columnValues={columnValues} />,
        value: option.id
      }))
    ],
    [columnValues]
  )

  return (
    <>
      <InspectorComposeField htmlFor={phaseId} label="Groupe">
        <Select
          items={phaseItems}
          value={bucket}
          disabled={saving}
          onValueChange={(value) => onBucketChange(value as RepaymentBucketId | null)}
        >
          <SelectTrigger id={phaseId} size="sm" className="w-full min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItems items={phaseItems} />
          </SelectContent>
        </Select>
      </InspectorComposeField>
      <InspectorComposeField htmlFor={commentId} label="Note (optionnel)">
        <RepaymentMentionTextarea
          id={commentId}
          value={comment}
          onChange={onCommentChange}
          placeholder="Contexte sur ce changement de groupe… Tapez @ pour mentionner un collègue"
          disabled={saving}
        />
      </InspectorComposeField>
      <InspectorComposeFooter onCancel={onCancel} pending={saving}>
        <Button type="button" size="sm" disabled={!canSave || saving} onClick={onSave}>
          Enregistrer
        </Button>
      </InspectorComposeFooter>
    </>
  )
}
