import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface Props {
  onStartReply: () => void
  onEdit?: () => void
  onDelete?: () => void
  editNoteId?: number
  className?: string
}

export const NOTE_AUTHOR_ACTION_CLASS =
  'opacity-0 group-focus-within/note:opacity-100 group-hover/note:opacity-100 focus:opacity-100'

/** CTAs under a repayment note — outline like the present verbs; edit/delete recede. */
export function NoteCommentActions({
  onStartReply,
  onEdit,
  onDelete,
  editNoteId,
  className
}: Props) {
  return (
    <div className={cn('mt-2 flex flex-wrap items-center gap-1.5', className)}>
      <Button type="button" variant="outline" size="xs" className="w-fit" onClick={onStartReply}>
        Répondre
      </Button>
      {onEdit ? (
        <Button
          type="button"
          variant="outline"
          size="xs"
          className={cn('w-fit', NOTE_AUTHOR_ACTION_CLASS)}
          data-note-edit-id={editNoteId}
          onClick={onEdit}
        >
          Modifier
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          type="button"
          variant="outline"
          size="xs"
          className={cn('w-fit', NOTE_AUTHOR_ACTION_CLASS)}
          onClick={onDelete}
        >
          Supprimer
        </Button>
      ) : null}
    </div>
  )
}
