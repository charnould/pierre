import { useId } from 'react'

import { InspectorComposeField } from '@/shared/components/inspector/inspector-compose-field'
import { InspectorComposeFooter } from '@/shared/components/inspector/inspector-compose-shell'
import { MentionTextarea } from '@/shared/components/inspector/mention-textarea'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { canonicalizeCaseTags } from '@/shared/lib/activities/case-workflow-config'

export function CaseTagsForm({
  tags,
  options,
  onTagsChange,
  comment,
  onCommentChange,
  onCancel,
  onSave,
  canSave,
  saving
}: {
  tags: string[]
  options: readonly string[]
  onTagsChange: (tags: string[]) => void
  comment: string
  onCommentChange: (comment: string) => void
  onCancel: () => void
  onSave: () => void
  canSave: boolean
  saving?: boolean
}) {
  const tagsId = useId()
  const commentId = useId()
  const selected = new Set(canonicalizeCaseTags(tags, options))

  function toggle(label: string, checked: boolean) {
    const next = checked ? [...tags, label] : tags.filter((tag) => tag !== label)
    onTagsChange(canonicalizeCaseTags(next, options))
  }

  return (
    <>
      <InspectorComposeField label="Tags">
        <div id={tagsId} className="flex flex-col gap-2">
          {options.map((label, index) => {
            const id = `${tagsId}-${index}`
            return (
              <div key={label} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={selected.has(label)}
                  disabled={saving}
                  onCheckedChange={(checked) => toggle(label, checked === true)}
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
        <MentionTextarea
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
