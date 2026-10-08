import { type PointerEvent, useEffect, useId, useRef, useState } from 'react'

import { loginFromEmail } from '@/features/activity/lib/notification-types'
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
  FieldError,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Kbd } from '@/shared/components/ui/kbd'
import { Slider } from '@/shared/components/ui/slider'
import { toast } from '@/shared/components/ui/toast'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import {
  AVATAR_ZOOM_MAX,
  AVATAR_ZOOM_MIN,
  clampPan,
  cropImageToWebpBlob
} from '@/shared/lib/avatar/crop-square'
import { bytesToDataUri } from '@/shared/lib/avatar/data-uri'
import { applyLocalAvatar, fetchOrgUsers } from '@/shared/lib/org-users-cache'
import { cn } from '@/shared/lib/utils'
import type { PickedAvatarImage } from '@/shared/types/users'

import {
  isReservedDisplayName,
  normalizeDisplayName,
  normalizePreferredName
} from '../../../../../shared/user-preferences'

const PREVIEW = 144
const SAVE_ERROR = 'Impossible d’enregistrer l’identité.'
const API_ERROR = 'Impossible d’enregistrer (API indisponible). Relancez l’application.'

const UNREADABLE_ERROR =
  'Ce fichier n’est pas disponible en local (Drive, iCloud…). Copiez-le sur le Bureau, puis réessayez.'

type EditorDraft =
  | { kind: 'none' }
  | { kind: 'reset' }
  | { kind: 'photo'; url: string; width: number; height: number }

interface Props {
  url: string
  email: string
  agentName: string
  preferredName: string | null
  onPreferredNameChange: (preferredName: string | null) => void
}

export function IdentityField({
  url,
  email,
  agentName,
  preferredName: initialPreferredName,
  onPreferredNameChange
}: Props) {
  const nameId = useId()
  const nameErrorId = useId()
  const preferredNameId = useId()
  const zoomId = useId()
  const login = loginFromEmail(email)
  const photoUrl = useUserAvatar(email)
  const [hasAvatar, setHasAvatar] = useState(false)
  const [displayName, setDisplayName] = useState(login)
  const [displayNameDraft, setDisplayNameDraft] = useState(login)
  const [displayNameError, setDisplayNameError] = useState('')
  const [preferredName, setPreferredName] = useState(initialPreferredName)
  const [preferredNameDraft, setPreferredNameDraft] = useState(initialPreferredName ?? '')
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState<EditorDraft>({ kind: 'none' })
  const [zoom, setZoom] = useState(AVATAR_ZOOM_MIN)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const photo = draft.kind === 'photo' ? draft : null

  useEffect(() => {
    let cancelled = false
    void fetchOrgUsers(url).then((users) => {
      if (cancelled) return
      const me = users.find((user) => user.email.toLowerCase() === email.toLowerCase())
      if (!me) return
      setHasAvatar(me.hasAvatar)
      const name = me.displayName?.trim() || login
      setDisplayName(name)
      setDisplayNameDraft(name)
    })
    return () => {
      cancelled = true
    }
  }, [url, email, login])

  async function patchDisplayName(next: string | null): Promise<boolean> {
    if (!window.api?.patchMyPreferences) {
      toast.add({ title: API_ERROR, type: 'error' })
      return false
    }
    setSaving(true)
    try {
      const res = await window.api.patchMyPreferences({ url, displayName: next })
      if (!res?.data) {
        toast.add({ title: SAVE_ERROR, type: 'error' })
        return false
      }
      setDisplayName(res.data.displayName)
      setDisplayNameDraft(res.data.displayName)
      applyLocalAvatar(email, undefined, res.data.displayName, url)
      return true
    } catch {
      toast.add({ title: SAVE_ERROR, type: 'error' })
      return false
    } finally {
      setSaving(false)
    }
  }

  async function commitDisplayName() {
    const normalized = normalizeDisplayName(displayNameDraft) ?? login
    const isCustom = normalized.toLowerCase() !== login.toLowerCase()
    if (isCustom && isReservedDisplayName(normalized, agentName)) {
      setDisplayNameError(`Ce nom est réservé à ${agentName}.`)
      return
    }
    setDisplayNameError('')
    setDisplayNameDraft(normalized)
    if (normalized === displayName || saving) return
    const previous = displayName
    setDisplayName(normalized)
    const ok = await patchDisplayName(isCustom ? normalized : null)
    if (!ok) {
      setDisplayName(previous)
      setDisplayNameDraft(previous)
    }
  }

  async function commitPreferredName() {
    const normalized = normalizePreferredName(preferredNameDraft)
    setPreferredNameDraft(normalized ?? '')
    if (normalized === preferredName || saving) return
    if (!window.api?.patchMyPreferences) {
      toast.add({ title: API_ERROR, type: 'error' })
      setPreferredNameDraft(preferredName ?? '')
      return
    }

    const previous = preferredName
    setPreferredName(normalized)
    setSaving(true)
    try {
      const res = await window.api.patchMyPreferences({
        url,
        preferredName: normalized
      })
      if (!res?.data) {
        toast.add({ title: SAVE_ERROR, type: 'error' })
        setPreferredName(previous)
        setPreferredNameDraft(previous ?? '')
        return
      }
      setPreferredName(res.data.preferredName)
      setPreferredNameDraft(res.data.preferredName ?? '')
      onPreferredNameChange(res.data.preferredName)
    } catch {
      toast.add({ title: SAVE_ERROR, type: 'error' })
      setPreferredName(previous)
      setPreferredNameDraft(previous ?? '')
    } finally {
      setSaving(false)
    }
  }

  function openEditor() {
    setDraft({ kind: 'none' })
    setZoom(AVATAR_ZOOM_MIN)
    setPan({ x: 0, y: 0 })
    setEditorOpen(true)
  }

  function applyPicked(picked: PickedAvatarImage) {
    if (picked.width < 1 || picked.height < 1) {
      toast.add({ title: UNREADABLE_ERROR, type: 'error' })
      return
    }
    setDraft({
      kind: 'photo',
      url: bytesToDataUri(new Uint8Array(picked.buffer), picked.type || 'image/png'),
      width: picked.width,
      height: picked.height
    })
    setZoom(AVATAR_ZOOM_MIN)
    setPan({ x: 0, y: 0 })
  }

  async function pickPhoto() {
    if (!window.api?.pickAvatarImage) {
      toast.add({ title: API_ERROR, type: 'error' })
      return
    }
    try {
      const picked = await window.api.pickAvatarImage()
      if (!picked) return
      applyPicked(picked)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      toast.add({
        title: /UNREADABLE_AVATAR|ETIMEDOUT|EPERM|EACCES/i.test(message)
          ? UNREADABLE_ERROR
          : 'Impossible de lire cette image.',
        type: 'error'
      })
    }
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!photo) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || !photo) return
    const next = clampPan(
      photo.width,
      photo.height,
      zoom,
      drag.panX + (event.clientX - drag.x),
      drag.panY + (event.clientY - drag.y),
      PREVIEW
    )
    setPan({ x: next.panX, y: next.panY })
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  async function saveAvatar() {
    setSaving(true)
    try {
      if (draft.kind === 'reset') {
        if (!window.api?.patchMyPreferences) {
          toast.add({ title: SAVE_ERROR, type: 'error' })
          return
        }
        const res = await window.api.patchMyPreferences({ url, avatar: null })
        if (!res?.data) {
          toast.add({ title: SAVE_ERROR, type: 'error' })
          return
        }
        applyLocalAvatar(email, null, res.data.displayName, url)
        setHasAvatar(false)
        setEditorOpen(false)
        return
      }
      if (!imageRef.current || imageRef.current.naturalWidth < 1) {
        toast.add({ title: 'Choisissez une photo avant d’enregistrer.', type: 'error' })
        return
      }
      if (!window.api?.uploadMyAvatar) {
        toast.add({ title: SAVE_ERROR, type: 'error' })
        return
      }
      const blob = await cropImageToWebpBlob(imageRef.current, zoom, pan.x, pan.y, PREVIEW)
      const buffer = await blob.arrayBuffer()
      const type = blob.type || 'image/webp'
      const res = await window.api.uploadMyAvatar({
        url,
        name: type === 'image/jpeg' ? 'avatar.jpg' : 'avatar.webp',
        type,
        buffer
      })
      if (!res?.data) {
        toast.add({ title: SAVE_ERROR, type: 'error' })
        return
      }
      applyLocalAvatar(email, bytesToDataUri(buffer, type), res.data.displayName, url)
      setHasAvatar(true)
      setEditorOpen(false)
    } catch {
      toast.add({ title: SAVE_ERROR, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const cover = photo ? (PREVIEW / Math.min(photo.width, photo.height)) * zoom : 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identité</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup variant="rows">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>Avatar</FieldLabel>
              <FieldDescription>
                Photo affichée dans les timelines et les mentions.
              </FieldDescription>
            </FieldContent>
            <Button
              type="button"
              variant="outline"
              className="justify-self-end"
              disabled={saving}
              onClick={openEditor}
            >
              Modifier votre avatar
            </Button>
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={nameId}>Nom d’affichage</FieldLabel>
              <FieldDescription>
                Jusqu’à 80 caractères. Sans nom personnalisé, c’est la partie avant @ de votre
                email.
              </FieldDescription>
            </FieldContent>
            <div className="flex min-w-0 flex-col gap-2">
              <Input
                id={nameId}
                value={displayNameDraft}
                disabled={saving}
                aria-invalid={!!displayNameError}
                aria-describedby={displayNameError ? nameErrorId : undefined}
                aria-errormessage={displayNameError ? nameErrorId : undefined}
                spellCheck={false}
                autoComplete="nickname"
                maxLength={80}
                placeholder={login}
                onChange={(e) => {
                  setDisplayNameDraft(e.target.value)
                  setDisplayNameError('')
                }}
                onBlur={() => void commitDisplayName()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void commitDisplayName()
                  }
                }}
              />
              {displayNameError ? (
                <FieldError id={nameErrorId}>{displayNameError}</FieldError>
              ) : null}
            </div>
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel htmlFor={preferredNameId}>
                Comment souhaitez-vous que <Kbd>{agentName}</Kbd> vous appelle ?
              </FieldLabel>
              <FieldDescription>
                Utilisé lorsque l’application s’adresse directement à vous.
              </FieldDescription>
            </FieldContent>
            <Input
              id={preferredNameId}
              value={preferredNameDraft}
              disabled={saving}
              spellCheck={false}
              autoComplete="given-name"
              maxLength={40}
              placeholder="Camille"
              onChange={(event) => setPreferredNameDraft(event.target.value)}
              onBlur={() => void commitPreferredName()}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void commitPreferredName()
                }
              }}
            />
          </Field>
        </FieldGroup>
      </CardContent>

      <Dialog
        disablePointerDismissal
        open={editorOpen}
        onOpenChange={(open, details) => {
          if (open || saving) return
          if (details.reason === 'focus-out' || details.reason === 'outside-press') return
          setEditorOpen(false)
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier votre avatar</DialogTitle>
            <DialogDescription>
              Choisissez une photo et cadrez-la dans le cercle avant l’envoi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div
              className={cn(
                'border-border relative size-36 self-center overflow-hidden rounded-full border',
                photo && 'cursor-grab active:cursor-grabbing'
              )}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {photo ? (
                <img
                  ref={imageRef}
                  src={photo.url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
                  style={{
                    width: photo.width * cover,
                    height: photo.height * cover,
                    transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`
                  }}
                />
              ) : (
                <UserAvatar
                  photoUrl={draft.kind === 'reset' ? null : photoUrl}
                  name={displayName}
                  login={login}
                  className="size-36"
                />
              )}
            </div>
            {photo ? (
              <Field>
                <FieldLabel htmlFor={zoomId}>Zoom</FieldLabel>
                <Slider
                  id={zoomId}
                  min={AVATAR_ZOOM_MIN}
                  max={AVATAR_ZOOM_MAX}
                  step={0.05}
                  value={[zoom]}
                  onValueChange={(value) => {
                    const next = typeof value === 'number' ? value : (value[0] ?? AVATAR_ZOOM_MIN)
                    setZoom(next)
                    setPan((prev) => {
                      const clamped = clampPan(
                        photo.width,
                        photo.height,
                        next,
                        prev.x,
                        prev.y,
                        PREVIEW
                      )
                      return { x: clamped.panX, y: clamped.panY }
                    })
                  }}
                />
              </Field>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => void pickPhoto()}
              >
                Choisir une photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving || (!hasAvatar && draft.kind !== 'photo')}
                onClick={() => setDraft({ kind: 'reset' })}
              >
                Réinitialiser
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setEditorOpen(false)}
            >
              Annuler
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveAvatar()}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
