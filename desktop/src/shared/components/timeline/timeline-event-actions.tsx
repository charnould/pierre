import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface Props {
  onStartReply?: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

export function TimelineEventActions({ onStartReply, onEdit, onDelete, className }: Props) {
  if (!onStartReply && !onEdit && !onDelete) return null
  return (
    <div className={cn('mt-2 flex w-fit flex-wrap gap-1', className)}>
      {onStartReply ? (
        <Button type="button" variant="outline" size="xs" className="w-fit" onClick={onStartReply}>
          Répondre
        </Button>
      ) : null}
      {onEdit ? (
        <Button type="button" variant="outline" size="xs" className="w-fit" onClick={onEdit}>
          Modifier
        </Button>
      ) : null}
      {onDelete ? (
        <Button type="button" variant="outline" size="xs" className="w-fit" onClick={onDelete}>
          Supprimer
        </Button>
      ) : null}
    </div>
  )
}
