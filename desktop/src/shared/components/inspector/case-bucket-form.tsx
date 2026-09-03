import { useId, useMemo } from 'react'

import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { MentionTextarea } from '@/shared/components/inspector/mention-textarea'
import { SelectItems } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import type { CaseBucketOption } from '@/shared/lib/activities/case-workflow-config'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import { CaseBucketBadge } from './case-bucket-badge'

export function CaseBucketForm({
  bucket,
  options,
  onBucketChange,
  comment,
  onCommentChange,
  columnValues,
  onCancel,
  onSave,
  canSave,
  saving = false,
  label = 'Panier'
}: {
  bucket: string | null
  options: readonly CaseBucketOption[]
  onBucketChange: (bucket: string | null) => void
  comment: string
  onCommentChange: (comment: string) => void
  columnValues?: ColumnValuesConfig
  onCancel: () => void
  onSave: () => void
  canSave: boolean
  saving?: boolean
  label?: string
}) {
  const bucketId = useId()
  const commentId = useId()
  const items = useMemo(
    () => [
      { label: <span className="text-muted-foreground">Sélectionner</span>, value: null },
      ...options.map((option) => ({
        label: <CaseBucketBadge bucket={option} columnValues={columnValues} />,
        value: option.id
      }))
    ],
    [columnValues, options]
  )

  return (
    <>
      <InspectorComposeField htmlFor={bucketId} label={label}>
        <Select items={items} value={bucket} disabled={saving} onValueChange={onBucketChange}>
          <SelectTrigger id={bucketId} size="sm" className="w-full min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItems items={items} />
          </SelectContent>
        </Select>
      </InspectorComposeField>
      <InspectorComposeField htmlFor={commentId} label="Note (optionnel)">
        <MentionTextarea
          id={commentId}
          value={comment}
          onChange={onCommentChange}
          placeholder={`Contexte sur ce changement de ${label.toLowerCase()}… Tapez @ pour mentionner un collègue`}
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
