import { Star } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/lib/utils'

export type DraftFeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialRating?: number | null
  initialComment?: string | null
  feedbackBy?: string | null
  feedbackAt?: string | null
  saving?: boolean
  onSave: (rating: number | null, comment: string) => void
}

function formatFeedbackAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

export function DraftFeedbackDialog({
  open,
  onOpenChange,
  initialRating = null,
  initialComment = null,
  feedbackBy = null,
  feedbackAt = null,
  saving = false,
  onSave
}: DraftFeedbackDialogProps) {
  const [rating, setRating] = useState<number | null>(initialRating)
  const [comment, setComment] = useState(initialComment ?? '')

  useEffect(() => {
    if (!open) return
    setRating(initialRating)
    setComment(initialComment ?? '')
  }, [open, initialRating, initialComment])

  const hasPriorFeedback = !!(feedbackBy && feedbackAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Évaluer la génération IA</DialogTitle>
          <DialogDescription>
            Notez la qualité du brouillon généré et laissez un commentaire optionnel.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium">Note</span>
            <div className="flex items-center gap-1" role="group" aria-label="Note de 1 à 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors',
                    rating != null && value <= rating && 'text-foreground'
                  )}
                  aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
                  aria-pressed={rating === value}
                  onClick={() => setRating(value)}
                >
                  <Star
                    className="size-5"
                    strokeWidth={1.75}
                    fill={rating != null && value <= rating ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="draft-feedback-comment"
              className="text-muted-foreground text-xs font-medium"
            >
              Commentaire
            </label>
            <Textarea
              id="draft-feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Précisions sur la qualité de la réponse…"
              className="min-h-[88px]"
            />
          </div>

          {hasPriorFeedback ? (
            <p className="text-muted-foreground text-xs">
              Noté par {feedbackBy} le {formatFeedbackAt(feedbackAt!)}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuler
          </Button>
          <Button type="button" disabled={saving} onClick={() => onSave(rating, comment.trim())}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
