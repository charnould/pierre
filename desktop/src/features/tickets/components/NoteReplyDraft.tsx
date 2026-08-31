import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'

interface Props {
  onStartReply: () => void
  className?: string
}

/** Outline CTA under a note — opens the compose comment form with @author prefilled. */
export function NoteReplyDraft({ onStartReply, className }: Props) {
  return (
    <div className={cn('mt-2', className)}>
      <Button type="button" variant="outline" size="xs" className="w-fit" onClick={onStartReply}>
        Répondre
      </Button>
    </div>
  )
}
