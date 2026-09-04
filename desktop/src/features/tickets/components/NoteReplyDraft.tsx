import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface Props {
  onStartReply: () => void
  onEdit?: () => void
  onDelete?: () => void
  className?: string
}

/** Outline CTA under a note — opens the compose comment form with @author prefilled. */
export function NoteReplyDraft({ onStartReply, onEdit, onDelete, className }: Props) {
  return (
    <div className={cn('mt-2 flex w-fit flex-wrap gap-1', className)}>
      <Button type="button" variant="outline" size="xs" className="w-fit" onClick={onStartReply}>
        Répondre
      </Button>
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
