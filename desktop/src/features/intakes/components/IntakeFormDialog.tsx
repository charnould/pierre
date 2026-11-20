import { normalize_knowledge_name } from '@pierre/shared/knowledge'
import { BookOpen, Copy, Eye, FileArchive } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { IntakeAccessSection } from '@/features/intakes/components/IntakeAccessSection'
import { IntakeFieldEditor } from '@/features/intakes/components/IntakeFieldEditor'
import {
  cleanIntakeFields,
  createEmptyIntakeConfig,
  type DraftIntakeField,
  intakeStatusLabel,
  intakeStatusVariant,
  toDraftIntakeFields,
  validateIntakeDraft
} from '@/features/intakes/lib/intake-ui'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
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
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Separator } from '@/shared/components/ui/separator'
import { Textarea } from '@/shared/components/ui/textarea'
import { requestSetup } from '@/shared/lib/open-setup'
import type {
  CreateIntakeBody,
  IntakeConfig,
  IntakeNotificationSchedule,
  IntakeRecord,
  PatchIntakeBody
} from '@/shared/types/intakes'

export type SaveIntakePayload =
  { mode: 'create'; body: CreateIntakeBody } | { mode: 'patch'; body: PatchIntakeBody }

type PreviewHandler = (draft: { name: string; description: string; config: IntakeConfig }) => void

export function IntakeCollaboratorDialog({
  open,
  intake,
  onClose,
  onPreview,
  onCopyLink,
  onExportZip
}: {
  open: boolean
  intake: IntakeRecord
  onClose: () => void
  onPreview: PreviewHandler
  onCopyLink?: (intake: IntakeRecord) => void
  onExportZip?: (intake: IntakeRecord) => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent viewport="form" className="overflow-y-auto sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{intake.name}</DialogTitle>
            <Badge variant={intakeStatusVariant(intake.status)}>
              {intakeStatusLabel(intake.status)}
            </Badge>
          </div>
          <DialogDescription>
            Vous êtes collaborateur sur cette collecte. Vous pouvez prévisualiser le formulaire,
            copier son lien public et exporter les réponses.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {intake.description ? (
            <p className="text-muted-foreground text-sm">{intake.description}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onPreview({
                  name: intake.name,
                  description: intake.description,
                  config: intake.config
                })
              }
            >
              <Eye data-icon="inline-start" />
              Prévisualiser
            </Button>
            {intake.status === 'published' && intake.token && onCopyLink ? (
              <Button type="button" variant="outline" onClick={() => onCopyLink(intake)}>
                <Copy data-icon="inline-start" />
                Copier le lien
              </Button>
            ) : null}
            {intake.publishedAt && onExportZip ? (
              <Button type="button" variant="outline" onClick={() => onExportZip(intake)}>
                <FileArchive data-icon="inline-start" />
                Exporter en ZIP
              </Button>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface Props {
  open: boolean
  intake: IntakeRecord | null
  url: string | undefined
  userLogin: string
  isAdministrator: boolean
  saving: boolean
  onClose: () => void
  onSave: (payload: SaveIntakePayload) => Promise<void>
  onPreview: PreviewHandler
}

export function IntakeFormDialog({
  open,
  intake,
  url,
  userLogin,
  isAdministrator,
  saving,
  onClose,
  onSave,
  onPreview
}: Props) {
  const isEditing = intake !== null
  const isPublished = intake !== null && intake.publishedAt !== null

  const initialConfig = intake?.config ?? createEmptyIntakeConfig()
  const [name, setName] = useState(intake?.name ?? '')
  const [tableName, setTableName] = useState(intake?.tableName ?? '')
  const [tableTouched, setTableTouched] = useState(isEditing)
  const [description, setDescription] = useState(intake?.description ?? '')
  const [publishToKnowledge, setPublishToKnowledge] = useState(intake?.publishToKnowledge ?? false)
  const [mentions, setMentions] = useState<string[]>(intake?.mentions ?? [])
  const [notice, setNotice] = useState(initialConfig.form.notice ?? '')
  const [passwords, setPasswords] = useState<string[]>(initialConfig.access.passwords)
  const [notifications, setNotifications] = useState<IntakeNotificationSchedule>(
    initialConfig.notifications
  )
  const [draftFields, setDraftFields] = useState<DraftIntakeField[]>(() =>
    toDraftIntakeFields(initialConfig.form.fields, isPublished)
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  function buildConfig(): IntakeConfig {
    return {
      form: {
        title: name.trim(),
        description: description.trim() || undefined,
        notice: notice.trim() || undefined,
        fields: cleanIntakeFields(draftFields.map((entry) => entry.field))
      },
      access: {
        passwords: passwords.map((password) => password.trim()).filter(Boolean)
      },
      notifications
    }
  }

  function handleNameChange(nextName: string) {
    setName(nextName)
    if (!tableTouched && !isPublished) {
      setTableName(normalize_knowledge_name(nextName))
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const error = validateIntakeDraft({
      name,
      tableName,
      entries: draftFields,
      isPublished,
      lockedColumns: intake?.lockedColumns ?? []
    })
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)

    const config = buildConfig()
    const normalizedTable = normalize_knowledge_name(tableName)

    if (isEditing) {
      const patch: PatchIntakeBody = {
        name: name.trim(),
        description: description.trim(),
        publishToKnowledge,
        mentions,
        config
      }
      if (!isPublished) {
        patch.tableName = normalizedTable
      }
      await onSave({ mode: 'patch', body: patch })
      return
    }

    await onSave({
      mode: 'create',
      body: {
        name: name.trim(),
        description: description.trim(),
        tableName: normalizedTable,
        publishToKnowledge,
        mentions,
        config
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DialogContent viewport="form" className="overflow-y-auto sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{isEditing ? 'Modifier la collecte' : 'Créer une collecte'}</DialogTitle>
            {intake ? (
              <Badge variant={intakeStatusVariant(intake.status)}>
                {intakeStatusLabel(intake.status)}
              </Badge>
            ) : null}
          </div>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5 py-1">
          <FieldSet>
            <FieldLegend>Identité</FieldLegend>
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="intake-name">Nom</FieldLabel>
                  <Input
                    id="intake-name"
                    value={name}
                    placeholder="Ex. Enquête de satisfaction"
                    onChange={(event) => handleNameChange(event.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="intake-table-name">Nom de la table</FieldLabel>
                  <Input
                    id="intake-table-name"
                    value={tableName}
                    disabled={isPublished}
                    placeholder="enquete_satisfaction"
                    onChange={(event) => {
                      setTableTouched(true)
                      setTableName(event.target.value)
                    }}
                    onBlur={() => {
                      if (!isPublished) setTableName(normalize_knowledge_name(tableName))
                    }}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="intake-description">Description</FieldLabel>
                <Textarea
                  id="intake-description"
                  rows={2}
                  value={description}
                  placeholder="Contexte affiché aux répondants et transmis à l’encyclopédie."
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>

              <Field>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Field orientation="horizontal" className="w-fit">
                    <Checkbox
                      id="intake-knowledge"
                      checked={publishToKnowledge}
                      onCheckedChange={(checked) => setPublishToKnowledge(checked === true)}
                    />
                    <FieldLabel htmlFor="intake-knowledge">Rejoindre l’encyclopédie</FieldLabel>
                  </Field>
                  {isAdministrator && intake?.publishToKnowledge ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        onClose()
                        requestSetup('knowledge')
                      }}
                    >
                      <BookOpen data-icon="inline-start" />
                      Ouvrir l’Encyclopédie
                    </Button>
                  ) : null}
                </div>
                <FieldDescription>
                  Les réponses sont projetées automatiquement dans l’encyclopédie. Seules les pièces
                  jointes (<code>_files</code>) et les colonnes personnelles reconnues (
                  <code>nom_locataire</code>, <code>prenom_locataire</code>,{' '}
                  <code>email_locataire</code>, <code>telephone_locataire</code>,{' '}
                  <code>adresse</code>, etc.) en sont exclues automatiquement : toute autre colonne
                  entre dans l’encyclopédie.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>

          <Separator />

          <IntakeAccessSection
            url={url}
            ownerLogin={intake?.owner ?? userLogin}
            mentions={mentions}
            onMentionsChange={setMentions}
            notifications={notifications}
            onNotificationsChange={setNotifications}
            passwords={passwords}
            onPasswordsChange={setPasswords}
          />

          <Separator />

          <FieldSet>
            <FieldLegend>Formulaire</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="intake-notice">Mentions libres (optionnel)</FieldLabel>
                <Textarea
                  id="intake-notice"
                  rows={2}
                  value={notice}
                  placeholder="Mentions RGPD, consignes ou coordonnées affichées en haut du formulaire."
                  onChange={(event) => setNotice(event.target.value)}
                />
              </Field>

              <IntakeFieldEditor
                entries={draftFields}
                onChange={setDraftFields}
                isPublished={isPublished}
              />
            </FieldGroup>
          </FieldSet>

          {validationError ? <FieldError>{validationError}</FieldError> : null}

          <DialogFooter className="flex-col items-stretch sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onPreview({
                  name: name.trim() || 'Collecte sans titre',
                  description: description.trim(),
                  config: buildConfig()
                })
              }
            >
              <Eye data-icon="inline-start" />
              Prévisualiser
            </Button>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Enregistrement…' : isEditing ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
