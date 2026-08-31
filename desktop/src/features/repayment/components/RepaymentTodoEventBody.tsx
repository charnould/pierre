import { Button } from '@/shared/components/ui/button'
import type { Activite } from '@/shared/types/activites'

import { parseRepaymentActionActivity } from '../lib/repayment-action-activity'
import { RepaymentMentionText } from './RepaymentMentionText'

interface Props {
  row: Activite
  current?: boolean
  userLogin?: string
  saving?: boolean
  onReopen?: (id: number, assigneA: string, dateEcheance: string) => void
}

export function RepaymentTodoEventBody({
  row,
  current = false,
  userLogin,
  saving = false,
  onReopen
}: Props) {
  const parsed = parseRepaymentActionActivity(row)
  if (!parsed) return null
  const { contenu, event } = parsed
  const comment = contenu.note?.trim() ?? ''
  const result = contenu.resultat?.trim() ?? ''
  const motif = contenu.motif?.trim() ?? ''
  const details =
    event === 'completed'
      ? [comment, result].filter((text, index, all) => text !== '' && all.indexOf(text) === index)
      : event === 'ignored'
        ? motif
          ? [motif]
          : []
        : comment
          ? [comment]
          : []
  if (details.length === 0 && !(current && event === 'completed' && onReopen)) return null

  return (
    <div className="flex flex-col gap-1.5">
      {details.map((text) => (
        <RepaymentMentionText
          key={text}
          text={text}
          mentionVariant="activity"
          compact
          className="text-muted-foreground m-0 text-xs leading-4 whitespace-pre-wrap"
        />
      ))}
      {current && event === 'completed' && onReopen ? (
        <div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={saving}
            onClick={() => {
              const today = new Date()
              const defaultDueDate = [
                today.getFullYear(),
                String(today.getMonth() + 1).padStart(2, '0'),
                String(today.getDate()).padStart(2, '0')
              ].join('-')
              onReopen(
                row.id,
                contenu.assigne_a ?? userLogin ?? '',
                contenu.date_echeance ?? defaultDueDate
              )
            }}
          >
            Rouvrir la tâche
          </Button>
        </div>
      ) : null}
    </div>
  )
}
