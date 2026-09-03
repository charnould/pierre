import { Calendar, EyeOff, Pencil, Square, Trash2 } from 'lucide-react'
import { type ReactNode, useId, useMemo, useState } from 'react'

import { CollaboratorPopoverPicker } from '@/shared/components/CollaboratorPopoverPicker'
import { CollaboratorChip } from '@/shared/components/inspector/collaborator-chip'
import { MentionText } from '@/shared/components/inspector/mention-text'
import { MentionTextarea } from '@/shared/components/inspector/mention-textarea'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { DatePicker } from '@/shared/components/ui/date-picker'
import { Field, FieldLabel } from '@/shared/components/ui/field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import type { ActionActivity } from '@/shared/lib/activities/action-activity'
import { resolveOrgUserFromFacetValue } from '@/shared/lib/org-user-list-item'
import { parseActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import { cn } from '@/shared/lib/utils'
import type { OrgUser } from '@/shared/types/users'

interface Props {
  actions: ActionActivity[]
  saving?: boolean
  userLogin?: string
  url?: string
  formatDate?: (value: string) => string
  onComplete?: (id: number) => void
  onIgnore?: (id: number, motif: string) => void
  onEdit?: (
    id: number,
    values: { action: string; assigneA: string; dateEcheance: string; note: string }
  ) => void
  onDelete?: (id: number) => void
  className?: string
}

function creatorIdentity(auteur: string): string {
  return parseActivityAuthor(auteur).id.trim()
}

function matchesCurrentUser(identity: string | undefined, userLogin: string | undefined): boolean {
  const normalizedUser = userLogin
    ?.replace(/^user:/, '')
    .split('@')[0]
    ?.toLowerCase()
  if (!normalizedUser) return false
  return (
    identity
      ?.replace(/^user:/, '')
      .split('@')[0]
      ?.toLowerCase() === normalizedUser
  )
}

function FlipRow({
  flipped,
  front,
  back
}: {
  flipped: boolean
  front: ReactNode
  back: ReactNode
}) {
  return (
    <div className="[perspective:1000px]">
      <div
        className={cn(
          'grid [transform-style:preserve-3d] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
          flipped && '[transform:rotateY(180deg)]'
        )}
      >
        <div
          className={cn(
            'col-start-1 row-start-1 grid min-w-0 [backface-visibility:hidden] transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
            flipped ? 'pointer-events-none grid-rows-[0fr]' : 'grid-rows-[1fr]'
          )}
          aria-hidden={flipped}
          inert={flipped || undefined}
        >
          <div className={cn('min-h-0 p-px', flipped ? 'overflow-hidden' : 'overflow-visible')}>
            {front}
          </div>
        </div>
        <div
          className={cn(
            'col-start-1 row-start-1 grid min-w-0 [backface-visibility:hidden] [transform:rotateY(180deg)_translateZ(1px)] transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
            flipped ? 'grid-rows-[1fr]' : 'pointer-events-none grid-rows-[0fr]'
          )}
          aria-hidden={!flipped}
          inert={!flipped || undefined}
        >
          <div className={cn('min-h-0 p-px', flipped ? 'overflow-visible' : 'overflow-hidden')}>
            {back}
          </div>
        </div>
      </div>
    </div>
  )
}

function OpenActionIconButton({
  label,
  tooltip,
  disabled,
  onClick,
  children
}: {
  label: string
  tooltip: string
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="mt-0.5 size-4"
            disabled={disabled}
            aria-label={label}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export function OpenActionMeta({
  auteur,
  assigneA,
  dateEcheance,
  note,
  formatDate
}: {
  auteur: string
  assigneA: string
  dateEcheance: string
  note?: string
  formatDate: (value: string) => string
}) {
  const creator = creatorIdentity(auteur)
  const dueLabel = formatDate(dateEcheance)
  const comment = note?.trim() ?? ''

  return (
    <div className="text-muted-foreground mt-1 grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-1.5 gap-y-1 text-xs leading-4">
      {dueLabel ? (
        <>
          <span>Échéance</span>
          <Badge variant="secondary" size="compact" className="w-fit">
            <Calendar data-icon="inline-start" aria-hidden className="size-3" />
            {dueLabel}
          </Badge>
        </>
      ) : null}
      {assigneA ? (
        <>
          <span>Assigné à</span>
          <CollaboratorChip identity={assigneA} compact />
        </>
      ) : null}
      {creator ? (
        <>
          <span>Créé par</span>
          <CollaboratorChip identity={creator} compact />
        </>
      ) : null}
      {comment ? (
        <>
          <span className="self-start">Note</span>
          <MentionText
            text={comment}
            mentionVariant="activity"
            compact
            className="text-foreground m-0 self-start text-xs leading-4 whitespace-pre-wrap"
          />
        </>
      ) : null}
    </div>
  )
}

function AssigneePicker({
  value,
  onChange,
  users,
  loading,
  saving
}: {
  value: string
  onChange: (identity: string) => void
  users: OrgUser[]
  loading: boolean
  saving: boolean
}) {
  const identity = parseActivityAuthor(value).id || value
  const selectedUser = useMemo(
    () => resolveOrgUserFromFacetValue(identity, users),
    [identity, users]
  )

  return (
    <CollaboratorPopoverPicker
      value={selectedUser}
      fallbackLogin={identity}
      users={users}
      loading={loading}
      disabled={saving}
      aria-label="Changer l’assigné"
      onChange={(user) => onChange(user.email)}
    />
  )
}

function OpenActionEditFace({
  initialAssignee,
  initialDue,
  initialComment,
  saving,
  url,
  onCancel,
  onSave
}: {
  initialAssignee: string
  initialDue: string
  initialComment: string
  saving: boolean
  url?: string
  onCancel: () => void
  onSave: (values: { assigneA: string; dateEcheance: string; note: string }) => void
}) {
  const dueId = useId()
  const commentId = useId()
  const { users, loading } = useOrgUsers(url)
  const [assignee, setAssignee] = useState(initialAssignee)
  const [due, setDue] = useState(initialDue)
  const [comment, setComment] = useState(initialComment)

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel>Assigné à</FieldLabel>
        <AssigneePicker
          value={assignee}
          onChange={setAssignee}
          users={users}
          loading={loading}
          saving={saving}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={dueId}>Échéance</FieldLabel>
        <DatePicker
          id={dueId}
          value={due}
          onChange={setDue}
          disabled={saving}
          size="sm"
          aria-label="Échéance"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={commentId}>Note</FieldLabel>
        <MentionTextarea
          id={commentId}
          value={comment}
          onChange={setComment}
          placeholder="Optionnel. Tapez @ pour mentionner un collègue"
          disabled={saving}
          url={url}
        />
      </Field>
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="outline" size="xs" disabled={saving} onClick={onCancel}>
          Annuler
        </Button>
        <Button
          type="button"
          size="xs"
          disabled={saving || !assignee.trim() || !due.trim()}
          onClick={() => onSave({ assigneA: assignee.trim(), dateEcheance: due, note: comment })}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  )
}

export function OpenActionRow({
  title,
  auteur,
  assigneA,
  dateEcheance,
  note,
  formatDate,
  completeEnabled = false,
  saving = false,
  onComplete,
  trailing,
  footer
}: {
  title: string
  auteur: string
  assigneA: string
  dateEcheance: string
  note?: string
  formatDate: (value: string) => string
  completeEnabled?: boolean
  saving?: boolean
  onComplete?: () => void
  trailing?: ReactNode
  footer?: ReactNode
}) {
  const square = <Square aria-hidden className="size-4" />
  return (
    <div className="flex min-w-0 items-start gap-2">
      {completeEnabled ? (
        <button
          type="button"
          disabled={saving || !onComplete}
          aria-label="Action à faire"
          className="text-muted-foreground mt-0.5 inline-flex size-4 shrink-0 items-center justify-center disabled:opacity-50"
          onClick={() => onComplete?.()}
        >
          {square}
        </button>
      ) : (
        <span
          aria-hidden
          className="text-muted-foreground mt-0.5 inline-flex size-4 shrink-0 items-center justify-center"
        >
          {square}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          <p className="text-foreground m-0 min-w-0 flex-1 text-sm leading-5 font-medium break-words whitespace-pre-wrap">
            {title}
          </p>
          {trailing}
        </div>
        <OpenActionMeta
          auteur={auteur}
          assigneA={assigneA}
          dateEcheance={dateEcheance}
          note={note}
          formatDate={formatDate}
        />
        {footer}
      </div>
    </div>
  )
}

export function OpenActionsCard({
  actions,
  saving = false,
  userLogin,
  url,
  formatDate = (value) => value,
  onComplete,
  onIgnore,
  onEdit,
  onDelete,
  className
}: Props) {
  const [ignoringId, setIgnoringId] = useState<number | null>(null)
  const [ignoreReason, setIgnoreReason] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)

  if (actions.length === 0) return null

  return (
    <section className={cn('border-border w-full rounded-md border px-3 py-2', className)}>
      <div className="flex flex-col gap-2">
        <span className="sr-only">Actions à faire</span>
        {actions.map(({ row, contenu, createdBy }) => {
          const ignoring = ignoringId === row.id
          const editing = editingId === row.id
          const canEdit =
            matchesCurrentUser(createdBy, userLogin) ||
            matchesCurrentUser(contenu.task.assignee?.id, userLogin)
          const canDelete = onDelete != null && matchesCurrentUser(createdBy, userLogin)
          return (
            <FlipRow
              key={row.id}
              flipped={editing}
              front={
                <OpenActionRow
                  title={contenu.task.title}
                  auteur={createdBy}
                  assigneA={contenu.task.assignee?.id ?? ''}
                  dateEcheance={contenu.task.due_date ?? ''}
                  note={contenu.note}
                  formatDate={formatDate}
                  completeEnabled
                  saving={saving}
                  onComplete={onComplete ? () => onComplete(row.id) : undefined}
                  trailing={
                    <>
                      {onIgnore ? (
                        <OpenActionIconButton
                          label={`Ignorer ${contenu.task.title}`}
                          tooltip="Ignorer"
                          disabled={saving}
                          onClick={() => {
                            setIgnoringId(row.id)
                            setEditingId(null)
                            setIgnoreReason('')
                          }}
                        >
                          <EyeOff aria-hidden className="size-4" />
                        </OpenActionIconButton>
                      ) : null}
                      {onEdit && canEdit ? (
                        <OpenActionIconButton
                          label={`Modifier ${contenu.task.title}`}
                          tooltip="Modifier"
                          disabled={saving}
                          onClick={() => {
                            setEditingId(row.id)
                            setIgnoringId(null)
                          }}
                        >
                          <Pencil aria-hidden className="size-4" />
                        </OpenActionIconButton>
                      ) : null}
                      {canDelete ? (
                        <OpenActionIconButton
                          label="Supprimer la tâche"
                          tooltip="Supprimer"
                          disabled={saving}
                          onClick={() => onDelete?.(row.id)}
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </OpenActionIconButton>
                      ) : null}
                    </>
                  }
                  footer={
                    ignoring ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <MentionTextarea
                          value={ignoreReason}
                          onChange={setIgnoreReason}
                          placeholder="Motif (optionnel)…"
                          disabled={saving}
                          url={url}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            disabled={saving}
                            onClick={() => setIgnoringId(null)}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            disabled={saving}
                            onClick={() => onIgnore?.(row.id, ignoreReason)}
                          >
                            Ignorer
                          </Button>
                        </div>
                      </div>
                    ) : null
                  }
                />
              }
              back={
                <OpenActionEditFace
                  initialAssignee={contenu.task.assignee?.id ?? ''}
                  initialDue={contenu.task.due_date ?? ''}
                  initialComment={contenu.note ?? ''}
                  saving={saving}
                  url={url}
                  onCancel={() => setEditingId(null)}
                  onSave={(values) =>
                    onEdit?.(row.id, {
                      action: contenu.task.title,
                      ...values
                    })
                  }
                />
              }
            />
          )
        })}
      </div>
    </section>
  )
}
