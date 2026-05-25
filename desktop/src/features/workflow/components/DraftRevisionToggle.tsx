import type { DraftRevision } from '@/features/tickets/lib/ticket-draft-revision'
import { Switch } from '@/shared/components/ui/switch'
import { FIELD_CAPTION } from '@/shared/lib/form-chrome'
import { cn } from '@/shared/lib/utils'

export type DraftRevisionToggleProps = {
  draftRevision: DraftRevision
  onDraftRevisionChange?: (revision: DraftRevision) => void
  isAutomationGenerated?: boolean
}

export function DraftRevisionToggle({
  draftRevision,
  onDraftRevisionChange,
  isAutomationGenerated = false
}: DraftRevisionToggleProps) {
  const generatedLabel =
    isAutomationGenerated && draftRevision === 'generated' ? 'Générée auto.' : 'Générée'
  const isEdited = draftRevision === 'edited'

  return (
    <div
      className="desk-draft-revision-switch flex shrink-0 items-center gap-2"
      role="group"
      aria-label="Version du brouillon"
    >
      <span
        className={cn(
          FIELD_CAPTION,
          'tabular-nums transition-colors',
          !isEdited ? 'font-medium text-desk-label' : 'text-desk-caption'
        )}
      >
        {generatedLabel}
      </span>
      <Switch
        size="sm"
        checked={isEdited}
        onCheckedChange={(checked) => onDraftRevisionChange?.(checked ? 'edited' : 'generated')}
        aria-label={isEdited ? 'Afficher la version éditée' : 'Afficher la version générée'}
      />
      <span
        className={cn(
          FIELD_CAPTION,
          'transition-colors',
          isEdited ? 'font-medium text-desk-label' : 'text-desk-caption'
        )}
      >
        Éditée
      </span>
    </div>
  )
}
