import { CaseBucketBadge } from '@/shared/components/inspector/case-bucket-badge'
import { MentionText } from '@/shared/components/inspector/mention-text'
import type { CaseBucketOption } from '@/shared/lib/activities/case-workflow-config'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'
import { parse_case_bucket_change_content, type Activite } from '@/shared/types/activites'

export function CaseBucketChangeBody({
  row,
  options,
  columnValues
}: {
  row: Activite
  options: readonly CaseBucketOption[]
  columnValues?: ColumnValuesConfig
}) {
  const change = parse_case_bucket_change_content(row.contenu)
  if (!change) return null
  const before = options.find((option) => option.id === change.bucket_precedent)
  const after = options.find((option) => option.id === change.bucket)

  return (
    <div className="mt-2 flex flex-col gap-1.5 text-xs leading-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {before ? (
          <>
            <CaseBucketBadge bucket={before} columnValues={columnValues} />
            <span className="text-muted-foreground">vers</span>
          </>
        ) : null}
        {after ? (
          <CaseBucketBadge bucket={after} columnValues={columnValues} />
        ) : (
          <span>{change.bucket}</span>
        )}
      </div>
      {change.note ? (
        <MentionText
          text={change.note}
          mentionVariant="activity"
          compact
          className="text-muted-foreground m-0 whitespace-pre-wrap"
        />
      ) : null}
    </div>
  )
}
