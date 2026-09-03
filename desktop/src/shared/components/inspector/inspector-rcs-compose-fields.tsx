import { Plus, Trash2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'

import { SelectItems } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'

import {
  RCS_CHOICES_MAX,
  rcs_compose_ready,
  type RcsChoice,
  type RcsComposeValue
} from '../../../../../shared/rcs-message'
import { InspectorComposeField } from './inspector-compose-field'
import { InspectorComposeFooter } from './inspector-compose-shell'

const TYPE_ITEMS = [
  { value: 'reply', label: 'Réponse' },
  { value: 'dial', label: 'Appel' },
  { value: 'url', label: 'Lien' }
] as const

type ChoiceKind = (typeof TYPE_ITEMS)[number]['value']

function emptyChoice(kind: ChoiceKind): RcsChoice {
  if (kind === 'reply') return { type: 'reply', label: '' }
  if (kind === 'dial') return { type: 'dial', label: '', phone: '' }
  return { type: 'url', label: '', url: '' }
}

function retargetChoice(choice: RcsChoice, kind: ChoiceKind): RcsChoice {
  const next = emptyChoice(kind)
  return { ...next, label: choice.label }
}

export function InspectorRcsFieldset({
  value,
  onChange,
  disabled = false,
  body,
  bodyId,
  fillBody = false
}: {
  value: RcsComposeValue
  onChange: (value: RcsComposeValue) => void
  disabled?: boolean
  body?: ReactNode
  bodyId?: string
  fillBody?: boolean
}) {
  const phoneId = useId()
  const generatedBodyId = useId()
  const smsId = useId()
  const fieldBodyId = bodyId ?? generatedBodyId
  const patch = (partial: Partial<RcsComposeValue>) => onChange({ ...value, ...partial })
  const setChoice = (index: number, choice: RcsChoice) => {
    patch({ choices: value.choices.map((entry, i) => (i === index ? choice : entry)) })
  }

  return (
    <>
      <InspectorComposeField htmlFor={phoneId} label="Téléphone">
        <Input
          id={phoneId}
          value={value.destinataire}
          disabled={disabled}
          onChange={(event) => patch({ destinataire: event.target.value })}
          type="tel"
          placeholder="06 12 34 56 78"
          autoComplete="tel"
        />
      </InspectorComposeField>
      <InspectorComposeField
        htmlFor={fieldBodyId}
        label="Message RCS"
        className={fillBody ? 'min-h-0 flex-1' : undefined}
        contentClassName={fillBody ? 'min-h-0 flex-1' : undefined}
      >
        {body ?? (
          <Textarea
            id={fieldBodyId}
            value={value.body}
            disabled={disabled}
            onChange={(event) => patch({ body: event.target.value })}
            placeholder="Rédigez votre RCS…"
            rows={5}
            className="min-h-28 resize-none"
          />
        )}
      </InspectorComposeField>
      <InspectorComposeField
        label="Actions proposées"
        hint="Boutons affichés sur le téléphone. Ils ne partent pas avec le SMS."
      >
        <div className="flex flex-col gap-2">
          {value.choices.map((choice, index) => (
            <ChoiceRow
              key={`${choice.type}-${index}`}
              choice={choice}
              disabled={disabled}
              onChange={(next) => setChoice(index, next)}
              onRemove={() => patch({ choices: value.choices.filter((_, i) => i !== index) })}
            />
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={disabled || value.choices.length >= RCS_CHOICES_MAX}
              render={<Button type="button" variant="outline" size="sm" className="w-fit" />}
            >
              <Plus className="size-3.5" aria-hidden />
              Ajouter une action
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-40">
              {TYPE_ITEMS.map((item) => (
                <DropdownMenuItem
                  key={item.value}
                  onClick={() => patch({ choices: [...value.choices, emptyChoice(item.value)] })}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </InspectorComposeField>
      <InspectorComposeField
        htmlFor={smsId}
        label="SMS de secours"
        hint="Si vide, le message RCS est utilisé. Envoyé au même numéro si le RCS échoue."
      >
        <Textarea
          id={smsId}
          value={value.sms_fallback}
          disabled={disabled}
          onChange={(event) => patch({ sms_fallback: event.target.value })}
          placeholder="Rédigez le SMS de secours…"
          rows={4}
          className="min-h-24 resize-none"
        />
      </InspectorComposeField>
    </>
  )
}

interface Props {
  value: RcsComposeValue
  onChange: (value: RcsComposeValue) => void
  onCancel: () => void
  onSend: () => void
  sending?: boolean
}

export function InspectorRcsComposeFields({
  value,
  onChange,
  onCancel,
  onSend,
  sending = false
}: Props) {
  return (
    <>
      <InspectorRcsFieldset value={value} onChange={onChange} disabled={sending} />
      <InspectorComposeFooter onCancel={onCancel} pending={sending}>
        <Button
          type="button"
          size="sm"
          disabled={!rcs_compose_ready(value) || sending}
          onClick={onSend}
        >
          Envoyer
        </Button>
      </InspectorComposeFooter>
    </>
  )
}

function ChoiceRow({
  choice,
  disabled,
  onChange,
  onRemove
}: {
  choice: RcsChoice
  disabled: boolean
  onChange: (choice: RcsChoice) => void
  onRemove: () => void
}) {
  const extra =
    choice.type === 'dial' ? (
      <Input
        aria-label="Numéro à appeler"
        placeholder="01 23 45 67 89"
        value={choice.phone}
        disabled={disabled}
        onChange={(event) => onChange({ ...choice, phone: event.target.value })}
      />
    ) : choice.type === 'url' ? (
      <Input
        aria-label="Lien"
        placeholder="https://"
        value={choice.url}
        disabled={disabled}
        onChange={(event) => onChange({ ...choice, url: event.target.value })}
      />
    ) : null

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Select
          items={[...TYPE_ITEMS]}
          value={choice.type}
          disabled={disabled}
          onValueChange={(next) => {
            if (next === 'reply' || next === 'dial' || next === 'url') {
              onChange(retargetChoice(choice, next))
            }
          }}
        >
          <SelectTrigger className="w-32 shrink-0" aria-label="Type d’action">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItems items={[...TYPE_ITEMS]} />
          </SelectContent>
        </Select>
        <Input
          aria-label="Libellé du bouton"
          placeholder="Libellé"
          value={choice.label}
          disabled={disabled}
          onChange={(event) => onChange({ ...choice, label: event.target.value })}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Retirer l’action"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      {extra}
    </div>
  )
}
