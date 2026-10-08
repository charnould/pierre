import { useId, useRef, useState } from 'react'

import {
  DEFAULT_MASCOT_BADGE_COLOR,
  DEFAULT_MASCOT_COLOR,
  DEFAULT_MASCOT_SHAPE,
  MASCOT_SHAPES,
  type MascotColor,
  type MascotLook,
  type MascotShape,
  parseMascotColor,
  randomMascotLook
} from '@/mascot/look'
import { MascotSvg } from '@/mascot/MascotSvg'
import { ChoiceTile } from '@/shared/components/ChoiceTile'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group'
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { DEFAULT_MASCOT_SETTINGS, MASCOT_SIZE_RANGE } from '@/shared/lib/ui-settings/schema'

const SHAPE_LABELS: Record<MascotShape, string> = {
  cercle: 'Cercle',
  galet: 'Galet',
  squircle: 'Squircle',
  capsule: 'Capsule',
  triangle: 'Triangle',
  hexagone: 'Hexagone',
  nuage: 'Nuage',
  goutte: 'Goutte'
}

function isMascotShape(value: string): value is MascotShape {
  return (MASCOT_SHAPES as readonly string[]).includes(value)
}

export type MascotAppearance = MascotLook & { size: number }

interface Props {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  size: number
  shape: MascotShape
  color: MascotColor
  badgeColor: MascotColor
  onAppearanceChange: (next: MascotAppearance, options: { persist: boolean }) => void
  disabled?: boolean
}

export function MascotField({
  enabled,
  onEnabledChange,
  size,
  shape,
  color,
  badgeColor,
  onAppearanceChange,
  disabled = false
}: Props) {
  const switchId = useId()
  const sliderId = useId()
  const shapeLabelId = useId()
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState<MascotAppearance>({ shape, color, badgeColor, size })
  const snapshotRef = useRef<MascotAppearance>({ shape, color, badgeColor, size })
  const committedRef = useRef(false)

  if (
    !editorOpen &&
    (draft.shape !== shape ||
      draft.color !== color ||
      draft.badgeColor !== badgeColor ||
      draft.size !== size)
  ) {
    setDraft({ shape, color, badgeColor, size })
  }

  const pushDraft = (next: MascotAppearance, persist: boolean) => {
    setDraft(next)
    onAppearanceChange(next, { persist })
  }

  const openEditor = () => {
    const current = { shape, color, badgeColor, size }
    snapshotRef.current = current
    committedRef.current = false
    setDraft(current)
    setEditorOpen(true)
  }

  const closeWithoutCommit = () => {
    if (!committedRef.current) {
      onAppearanceChange(snapshotRef.current, { persist: false })
      setDraft(snapshotRef.current)
    }
    committedRef.current = false
    setEditorOpen(false)
  }

  const save = () => {
    committedRef.current = true
    onAppearanceChange(draft, { persist: true })
    setEditorOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compagnon</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup variant="rows">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={switchId}>Afficher sur le bureau</FieldLabel>
              <FieldDescription>
                Icône flottante. Une pastille signale ce qui n’a pas été lu. Un clic ramène Pierre.
              </FieldDescription>
            </FieldContent>
            <Switch
              id={switchId}
              className="justify-self-end"
              checked={enabled}
              disabled={disabled}
              onCheckedChange={onEnabledChange}
            />
          </Field>
          {enabled ? (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>Modifier le compagnon</FieldLabel>
                <FieldDescription>Forme, couleurs et taille sur le bureau.</FieldDescription>
              </FieldContent>
              <Button
                type="button"
                variant="outline"
                className="justify-self-end"
                disabled={disabled}
                onClick={openEditor}
              >
                Modifier l’apparence
              </Button>
            </Field>
          ) : null}
        </FieldGroup>
      </CardContent>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) closeWithoutCommit()
        }}
      >
        <DialogContent
          viewport="form"
          showCloseButton={false}
          className="overflow-y-auto sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle>Modifier l’apparence</DialogTitle>
            <DialogDescription>
              Forme, couleurs et taille du compagnon sur le bureau.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <MascotSvg
              shape={draft.shape}
              color={draft.color}
              badgeColor={draft.badgeColor}
              showPastille
              className="size-16"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => pushDraft({ ...draft, ...randomMascotLook(draft) }, false)}
              >
                Aléatoire
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  pushDraft(
                    {
                      shape: DEFAULT_MASCOT_SHAPE,
                      color: DEFAULT_MASCOT_COLOR,
                      badgeColor: DEFAULT_MASCOT_BADGE_COLOR,
                      size: DEFAULT_MASCOT_SETTINGS.size!
                    },
                    false
                  )
                }
              >
                Réinitialiser
              </Button>
            </div>
            <Field>
              <FieldLabel id={shapeLabelId}>Forme</FieldLabel>
              <FieldDescription>Silhouette du compagnon sur le bureau.</FieldDescription>
              <RadioGroup
                value={draft.shape}
                aria-labelledby={shapeLabelId}
                onValueChange={(next) => {
                  if (isMascotShape(next)) pushDraft({ ...draft, shape: next }, false)
                }}
              >
                {MASCOT_SHAPES.map((id) => {
                  const inputId = `${shapeLabelId}-${id}`
                  return (
                    <ChoiceTile
                      key={id}
                      as="label"
                      htmlFor={inputId}
                      interactive
                      selected={draft.shape === id}
                      icon={
                        <MascotSvg shape={id} color={draft.color} face={false} className="size-4" />
                      }
                      title={SHAPE_LABELS[id]}
                      signal={<RadioGroupItem value={id} id={inputId} />}
                    />
                  )
                })}
              </RadioGroup>
            </Field>
            <ColorField
              label="Couleur"
              description="Matière du corps. Les reflets se dérivent autour de cette teinte."
              value={draft.color}
              onChange={(next) => pushDraft({ ...draft, color: next }, false)}
            />
            <ColorField
              label="Pastille"
              description="Signale une ou plusieurs notifications non lues."
              value={draft.badgeColor}
              onChange={(next) => pushDraft({ ...draft, badgeColor: next }, false)}
            />
            <Field>
              <FieldLabel htmlFor={sliderId}>
                Taille
                <span className="text-muted-foreground">{draft.size} px</span>
              </FieldLabel>
              <Slider
                id={sliderId}
                value={draft.size}
                min={MASCOT_SIZE_RANGE.min}
                max={MASCOT_SIZE_RANGE.max}
                step={MASCOT_SIZE_RANGE.step}
                getAriaValueText={(_formatted, value) => `${value} px`}
                onValueChange={(value) => {
                  const next = typeof value === 'number' ? value : value[0]!
                  pushDraft({ ...draft, size: next }, false)
                }}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeWithoutCommit}>
              Annuler
            </Button>
            <Button type="button" onClick={save}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ColorField({
  label,
  description,
  value,
  onChange
}: {
  label: string
  description: string
  value: MascotColor
  onChange: (value: MascotColor) => void
}) {
  const id = useId()
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      <Input
        id={id}
        type="color"
        value={value}
        onChange={(e) => {
          const next = parseMascotColor(e.target.value)
          if (next) onChange(next)
        }}
      />
    </Field>
  )
}
