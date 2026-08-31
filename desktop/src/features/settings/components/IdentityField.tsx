import { useEffect, useId, useRef, useState, type PointerEvent } from 'react'

import { loginFromEmail } from '@/features/activity/lib/notification-types'
import { Button } from '@/shared/components/ui/button'
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
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
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

import { isReservedDisplayName, normalizeDisplayName } from '../../../../../shared/automations'

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
}

export function IdentityField({ url, email, agentName }: Props) {
  const headingId = useId()
  const nameId = useId()
  const nameErrorId = useId()
  const zoomId = useId()
  const login = loginFromEmail(email)
  const photoUrl = useUserAvatar(login)
  const [hasAvatar, setHasAvatar] = useState(false)
  const [displayName, setDisplayName] = useState(login)
  const [displayNameDraft, setDisplayNameDraft] = useState(login)
  const [displayNameError, setDisplayNameError] = useState('')
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
      const me = users.find((user) => user.login.toLowerCase() === login.toLowerCase())
      if (!me) return
      setHasAvatar(me.hasAvatar)
      const name = me.displayName?.trim() || login
      setDisplayName(name)
      setDisplayNameDraft(name)
    })
    return () => {
      cancelled = true
    }
  }, [url, login])

  async function patchDisplayName(next: string | null): Promise<boolean> {
    if (!window.api?.patchMyPreferences) {
      toast.add({ title: API_ERROR, type: 'error' })
      return false
    }
    setSaving(true)
    try {
      const res = await window.api.patchMyPreferences({ url, display_name: next })
      if (!res?.data) {
        toast.add({ title: SAVE_ERROR, type: 'error' })
        return false
      }
      setDisplayName(res.data.displayName)
      setDisplayNameDraft(res.data.displayName)
      applyLocalAvatar(login, undefined, res.data.displayName)
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
        applyLocalAvatar(login, null, res.data.displayName)
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
      applyLocalAvatar(login, bytesToDataUri(buffer, type), res.data.displayName)
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
    <Field aria-labelledby={headingId} className="border-border rounded-md border p-4">
      <div className="flex flex-col gap-0.5">
        <FieldTitle id={headingId}>Identité</FieldTitle>
        <FieldDescription>
          Nom et avatar affichés dans les timelines et les mentions. Sans nom personnalisé, c’est la
          partie avant @ de votre email.
        </FieldDescription>
      </div>
      <FieldLabel htmlFor={nameId} className="sr-only">
        Nom d’affichage
      </FieldLabel>
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar photoUrl={photoUrl} name={displayName} login={login} />
        <Input
          id={nameId}
          aria-label="Nom d’affichage"
          value={displayNameDraft}
          disabled={saving}
          aria-invalid={!!displayNameError}
          aria-describedby={displayNameError ? nameErrorId : undefined}
          aria-errormessage={displayNameError ? nameErrorId : undefined}
          spellCheck={false}
          autoComplete="nickname"
          maxLength={80}
          placeholder={login}
          className="min-w-0 flex-1"
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
        <Button type="button" variant="outline" size="sm" disabled={saving} onClick={openEditor}>
          Modifier votre avatar
        </Button>
      </div>
      {displayNameError ? <FieldError id={nameErrorId}>{displayNameError}</FieldError> : null}

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
            <DialogDescription className="text-balance">
              Choisissez une photo et cadrez-la dans le cercle avant l’envoi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                'border-border relative size-36 overflow-hidden rounded-full border',
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
                    width: `${photo.width * cover}px`,
                    height: `${photo.height * cover}px`,
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
            <div className="flex flex-wrap justify-center gap-2">
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
    </Field>
  )
}
