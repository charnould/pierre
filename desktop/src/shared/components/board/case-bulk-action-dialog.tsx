import { useId, useState } from 'react'

import { SelectItems } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/shared/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Spinner } from '@/shared/components/ui/spinner'
import { Textarea } from '@/shared/components/ui/textarea'

export type CaseBulkAction =
  | { kind: 'phase'; phase: string }
  | { kind: 'tag'; operation: 'add' | 'remove'; tag: string }
  | { kind: 'pierre'; mission: 'reponse' | 'synthese' | 'autre'; instruction: string }

export type CaseBulkProgress = {
  index: number
  total: number
}

type Kind = CaseBulkAction['kind']
type PierreMission = Extract<CaseBulkAction, { kind: 'pierre' }>['mission']

export function CaseBulkActionDialog({
  open,
  countLabel,
  description,
  phaseChoiceLabel,
  phaseFieldLabel,
  phasePlaceholder,
  phases,
  tags,
  progress,
  progressLabel,
  pierreHint,
  onClose,
  onStop,
  onSubmit
}: {
  open: boolean
  countLabel: string
  description: string
  phaseChoiceLabel: string
  phaseFieldLabel: string
  phasePlaceholder: string
  phases: readonly { id: string; label: string }[]
  tags: readonly string[]
  progress: CaseBulkProgress | null
  progressLabel: (progress: CaseBulkProgress) => string
  pierreHint: string
  onClose: () => void
  onStop: () => void
  onSubmit: (action: CaseBulkAction) => Promise<void>
}) {
  const formId = useId()
  const [kind, setKind] = useState<Kind>('phase')
  const [phase, setPhase] = useState('')
  const [tagOperation, setTagOperation] = useState<'add' | 'remove'>('add')
  const [tag, setTag] = useState('')
  const [mission, setMission] = useState<PierreMission>('reponse')
  const [instruction, setInstruction] = useState('')
  const running = progress != null
  const action = currentAction({ kind, phase, tagOperation, tag, mission, instruction })
  const phaseItems = phases.map((entry) => ({ value: entry.id, label: entry.label }))
  const tagItems = tags.map((entry) => ({ value: entry, label: entry }))
  const submit = () => {
    if (!action || running) return
    void onSubmit(action)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !running) onClose()
      }}
    >
      <DialogContent
        viewport="form"
        className="overflow-y-auto sm:max-w-2xl"
        showCloseButton={!running}
        aria-busy={running}
      >
        <DialogHeader>
          <DialogTitle>Agir sur {countLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel id={`${formId}-kind`}>Action</FieldLabel>
            <RadioGroup
              value={kind}
              aria-labelledby={`${formId}-kind`}
              disabled={running}
              onValueChange={(next) => {
                if (next === 'phase' || next === 'tag' || next === 'pierre') setKind(next)
              }}
            >
              <Choice id={`${formId}-phase`} value="phase" label={phaseChoiceLabel} />
              <Choice id={`${formId}-tag`} value="tag" label="Changer un tag" />
              <Choice id={`${formId}-pierre`} value="pierre" label="Demander à Pierre" />
            </RadioGroup>
          </Field>

          {kind === 'phase' ? (
            <Field>
              <FieldLabel htmlFor={`${formId}-phase-value`}>{phaseFieldLabel}</FieldLabel>
              <Select
                items={phaseItems}
                value={phase}
                disabled={running}
                onValueChange={(next) => setPhase(next ?? '')}
              >
                <SelectTrigger id={`${formId}-phase-value`} className="w-full">
                  <SelectValue placeholder={phasePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItems items={phaseItems} />
                </SelectContent>
              </Select>
            </Field>
          ) : null}

          {kind === 'tag' ? (
            <>
              <Field>
                <FieldLabel id={`${formId}-tag-operation`}>Opération</FieldLabel>
                <RadioGroup
                  value={tagOperation}
                  aria-labelledby={`${formId}-tag-operation`}
                  disabled={running}
                  onValueChange={(next) => {
                    if (next === 'add' || next === 'remove') setTagOperation(next)
                  }}
                >
                  <Choice id={`${formId}-tag-add`} value="add" label="Ajouter" />
                  <Choice id={`${formId}-tag-remove`} value="remove" label="Retirer" />
                </RadioGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor={`${formId}-tag-value`}>Tag</FieldLabel>
                <Select
                  items={tagItems}
                  value={tag}
                  disabled={running}
                  onValueChange={(next) => setTag(next ?? '')}
                >
                  <SelectTrigger id={`${formId}-tag-value`} className="w-full">
                    <SelectValue placeholder="Choisir un tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItems items={tagItems} />
                  </SelectContent>
                </Select>
              </Field>
            </>
          ) : null}

          {kind === 'pierre' ? (
            <>
              <Field>
                <FieldLabel id={`${formId}-mission`}>Mission</FieldLabel>
                <FieldDescription>{pierreHint}</FieldDescription>
                <RadioGroup
                  value={mission}
                  aria-labelledby={`${formId}-mission`}
                  disabled={running}
                  onValueChange={(next) => {
                    if (next === 'reponse' || next === 'synthese' || next === 'autre')
                      setMission(next)
                  }}
                >
                  <Choice id={`${formId}-reply`} value="reponse" label="Réponse possible" />
                  <Choice id={`${formId}-summary`} value="synthese" label="Synthèse" />
                  <Choice id={`${formId}-other`} value="autre" label="Autre" />
                </RadioGroup>
              </Field>
              {mission === 'autre' ? (
                <Field>
                  <FieldLabel htmlFor={`${formId}-instruction`}>Consigne</FieldLabel>
                  <Textarea
                    id={`${formId}-instruction`}
                    value={instruction}
                    disabled={running}
                    placeholder="Décrivez ce que Pierre doit produire pour chaque élément"
                    onChange={(event) => setInstruction(event.target.value)}
                  />
                </Field>
              ) : null}
            </>
          ) : null}

          {progress ? (
            <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
              {progressLabel(progress)}
            </p>
          ) : null}
        </FieldGroup>
        <DialogFooter>
          {running ? (
            <Button type="button" variant="outline" onClick={onStop}>
              Arrêter
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
          )}
          <Button type="button" disabled={running || action == null} onClick={submit}>
            {running ? <Spinner data-icon="inline-start" /> : null}
            {kind === 'pierre' ? 'Demander à Pierre' : 'Appliquer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Choice({ id, value, label }: { id: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem id={id} value={value} />
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
    </div>
  )
}

function currentAction(input: {
  kind: Kind
  phase: string
  tagOperation: 'add' | 'remove'
  tag: string
  mission: PierreMission
  instruction: string
}): CaseBulkAction | null {
  if (input.kind === 'phase') return input.phase ? { kind: 'phase', phase: input.phase } : null
  if (input.kind === 'tag') {
    return input.tag ? { kind: 'tag', operation: input.tagOperation, tag: input.tag } : null
  }
  if (input.mission === 'autre' && input.instruction.trim() === '') return null
  return { kind: 'pierre', mission: input.mission, instruction: input.instruction }
}
