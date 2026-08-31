import { useId } from 'react'

import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'

import { canonicalizeRepaymentTags, REPAYMENT_TAG_OPTIONS } from '../lib/repayment-tags'
import { RepaymentMentionTextarea } from './RepaymentMentionTextarea'

interface Props {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  comment: string
  onCommentChange: (comment: string) => void
  onCancel: () => void
  onSave: () => void
  canSave: boolean
  saving?: boolean
}

export function RepaymentTagsForm({
  tags,
  onTagsChange,
  comment,
  onCommentChange,
  onCancel,
  onSave,
  canSave,
  saving = false
}: Props) {
  const tagsId = useId()
  const commentId = useId()
  const selected = new Set(canonicalizeRepaymentTags(tags))

  function toggle(label: string, checked: boolean) {
    if (checked) onTagsChange(canonicalizeRepaymentTags([...tags, label]))
    else onTagsChange(tags.filter((tag) => tag !== label))
  }

  return (
    <>
      <InspectorComposeField label="Tags">
        <div className="flex flex-col gap-2">
          {REPAYMENT_TAG_OPTIONS.map((label) => {
            const id = `${tagsId}-${label}`
            return (
              <div key={label} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={selected.has(label)}
                  disabled={saving}
                  onCheckedChange={(next) => toggle(label, next === true)}
                />
                <label htmlFor={id} className="min-w-0 text-sm leading-5 font-normal">
                  {label}
                </label>
              </div>
            )
          })}
        </div>
      </InspectorComposeField>
      <InspectorComposeField htmlFor={commentId} label="Note (optionnel)">
        <RepaymentMentionTextarea
          id={commentId}
          value={comment}
          onChange={onCommentChange}
          placeholder="Contexte sur ces tags… Tapez @ pour mentionner un collègue"
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
