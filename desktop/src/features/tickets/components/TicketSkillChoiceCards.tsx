import { FilePenLine, Mail, NotebookPen, ScrollText } from 'lucide-react'
import type { ComponentType } from 'react'
import { useId } from 'react'

import { TICKET_SKILL_OPTIONS, type TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import { draftHasFormat } from '@/features/tickets/lib/ticket-draft-icons'
import { Badge } from '@/shared/components/ui/badge'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { FIELD_CAPTION, FIELD_HEADING, FIELD_HEADING_GROUP } from '@/shared/lib/form-chrome'
import { cn } from '@/shared/lib/utils'

const SKILL_ICONS: Record<
  TicketSkillKey,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  ticketReplyEmail: Mail,
  ticketReplyLetter: ScrollText,
  ticketWriteMemo: NotebookPen,
  ticketRewriteTicket: FilePenLine
}

interface Props {
  value: TicketSkillKey
  onValueChange: (value: TicketSkillKey) => void
  draftIdSkills?: string[]
  draftAnswerChannel?: string | null
}

export function TicketSkillChoiceCards({
  value,
  onValueChange,
  draftIdSkills,
  draftAnswerChannel
}: Props) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const descriptionId = `${baseId}-description`

  return (
    <Field>
      <div className={FIELD_HEADING_GROUP}>
        <FieldLabel id={labelId} className={FIELD_HEADING}>
          Format de réponse
        </FieldLabel>
        <FieldDescription id={descriptionId} className={FIELD_CAPTION}>
          Type de document à générer pour ce dossier.
        </FieldDescription>
      </div>
      <RadioGroup
        value={value}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onValueChange={(v) => {
          if (TICKET_SKILL_OPTIONS.some((o) => o.value === v)) {
            onValueChange(v as TicketSkillKey)
          }
        }}
        className="workflow-choice-radio-group"
      >
        {TICKET_SKILL_OPTIONS.map((opt) => {
          const id = `${baseId}-${opt.value}`
          const hasDraft = draftHasFormat(draftIdSkills, opt.value, draftAnswerChannel)
          const isSelected = value === opt.value
          const Icon = SKILL_ICONS[opt.value]
          return (
            <label
              key={opt.value}
              htmlFor={id}
              className={cn('workflow-choice-row', isSelected && 'workflow-choice-row--selected')}
            >
              <RadioGroupItem value={opt.value} id={id} className="workflow-choice-radio-sr" />
              <span className="workflow-choice-row__icon">
                <Icon strokeWidth={1.75} />
              </span>
              <span className="workflow-choice-row__label">{opt.label}</span>
              <span className="workflow-choice-row__badge-col">
                {hasDraft ? (
                  <Badge variant="neutral" size="compact" title="Brouillon disponible">
                    <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />
                    Généré
                  </Badge>
                ) : null}
              </span>
            </label>
          )
        })}
      </RadioGroup>
    </Field>
  )
}
