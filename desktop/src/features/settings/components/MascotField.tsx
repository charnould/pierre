import { useId, useRef, useState } from 'react'

import {
  DEFAULT_MASCOT_BADGE_COLOR,
  DEFAULT_MASCOT_COLOR,
  DEFAULT_MASCOT_SHAPE,
  MASCOT_SHAPES,
  parseMascotColor,
  randomMascotLook,
  type MascotColor,
  type MascotLook,
  type MascotShape
} from '@/mascot/look'
import { MascotSvg } from '@/mascot/MascotSvg'
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
import { Slider } from '@/shared/components/ui/slider'
import { Switch } from '@/shared/components/ui/switch'
import { DEFAULT_MASCOT_SETTINGS, MASCOT_SIZE_RANGE } from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'

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
  const headingId = useId()
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
    <Field aria-labelledby={headingId} className="border-border rounded-md border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <FieldLabel id={headingId} htmlFor={switchId}>
            Compagnon
          </FieldLabel>
          <FieldDescription>
            Icône flottante. Une pastille signale ce qui n’a pas été lu. Un clic ramène Pierre.
          </FieldDescription>
        </div>
        <Switch
          id={switchId}
          className="mt-0.5"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={onEnabledChange}
        />
      </div>
      <div className="flex min-w-0 items-center gap-3">
        <MascotSvg shape={shape} color={color} face={false} className="size-10 shrink-0" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || !enabled}
          onClick={openEditor}
        >
          Modifier l’apparence
        </Button>
      </div>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (!open) closeWithoutCommit()
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle>Modifier l’apparence</DialogTitle>
            <DialogDescription className="text-balance">
              Forme, couleurs et taille du compagnon sur le bureau.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-start gap-4">
              <div className="sticky top-0 flex w-36 shrink-0 flex-col items-center gap-2">
                <MascotSvg
                  shape={draft.shape}
                  color={draft.color}
                  badgeColor={draft.badgeColor}
                  showPastille
                  className="size-36"
                />
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
              <FieldGroup className="min-w-0 flex-1">
                <Field>
                  <FieldLabel>Forme</FieldLabel>
                  <FieldDescription className="text-balance">
                    Silhouette du compagnon sur le bureau.
                  </FieldDescription>
                  <div className="flex flex-wrap gap-2">
                    {MASCOT_SHAPES.map((id) => (
                      <button
                        key={id}
                        type="button"
                        aria-label={SHAPE_LABELS[id]}
                        aria-pressed={draft.shape === id}
                        title={SHAPE_LABELS[id]}
                        className={cn(
                          'border-input flex size-16 items-center justify-center rounded-md border',
                          draft.shape === id && 'bg-muted'
                        )}
                        onClick={() => pushDraft({ ...draft, shape: id }, false)}
                      >
                        <MascotSvg
                          shape={id}
                          color={draft.color}
                          face={false}
                          className="size-12"
                        />
                      </button>
                    ))}
                  </div>
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
                  <div className="flex items-center gap-3">
                    <FieldLabel htmlFor={sliderId} className="w-14 shrink-0">
                      Taille
                    </FieldLabel>
                    <div className="min-w-0 flex-1">
                      <Slider
                        id={sliderId}
                        value={draft.size}
                        min={MASCOT_SIZE_RANGE.min}
                        max={MASCOT_SIZE_RANGE.max}
                        step={MASCOT_SIZE_RANGE.step}
                        onValueChange={(value) => {
                          const next = typeof value === 'number' ? value : value[0]!
                          pushDraft({ ...draft, size: next }, false)
                        }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-end text-[0.8125rem] leading-[1.125rem] tabular-nums">
                      {draft.size} px
                    </span>
                  </div>
                </Field>
              </FieldGroup>
            </div>
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
    </Field>
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
  return (
    <Field className="w-auto">
      <FieldLabel>{label}</FieldLabel>
      <FieldDescription className="text-balance">{description}</FieldDescription>
      <div>
        <input
          type="color"
          aria-label={label}
          value={value}
          className="border-input size-8 cursor-pointer rounded-md border bg-transparent p-0"
          onChange={(e) => {
            const next = parseMascotColor(e.target.value)
            if (next) onChange(next)
          }}
        />
      </div>
    </Field>
  )
}
