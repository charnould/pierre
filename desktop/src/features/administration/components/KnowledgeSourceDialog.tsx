import { intakeTableNameFromOriginalName } from '@pierre/shared/intakes'
import { normalize_knowledge_name } from '@pierre/shared/knowledge'
import { type BusinessModuleId, knowledgePublishModules } from '@pierre/shared/modules'
import { useId, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
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
import { Spinner } from '@/shared/components/ui/spinner'
import type { KnowledgeProfile, KnowledgeSource } from '@/shared/types/knowledge'

interface Props {
  url: string
  source: KnowledgeSource
  profiles: KnowledgeProfile[]
  onClose: () => void
  onSaved: (source: KnowledgeSource) => void
}

export const officialEncyclopediaTitle = (
  source: Pick<KnowledgeSource, 'fileType' | 'originalName' | 'sheetName'>
): string =>
  source.fileType === 'xlsx'
    ? (source.sheetName ?? source.originalName.replace(/\.[^.]+$/, ''))
    : source.originalName.replace(/\.[^.]+$/, '')

export const encyclopediaTitleForSave = (
  title: string,
  source: Pick<KnowledgeSource, 'fileType' | 'originalName' | 'sheetName'>
): string => title.trim() || officialEncyclopediaTitle(source)

export function KnowledgeSourceDialog({ url, source, profiles, onClose, onSaved }: Props) {
  const fieldId = useId()
  const [title, setTitle] = useState(source.title)
  const [profileIds, setProfileIds] = useState(source.profileIds)
  const [moduleIds, setModuleIds] = useState(source.moduleIds)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggleProfile(profileId: string, checked: boolean) {
    setProfileIds((current) =>
      checked ? [...new Set([...current, profileId])] : current.filter((id) => id !== profileId)
    )
  }

  function toggleModule(moduleId: BusinessModuleId, checked: boolean) {
    setModuleIds((current) =>
      checked ? [...new Set([...current, moduleId])] : current.filter((id) => id !== moduleId)
    )
  }

  async function save() {
    setSaving(true)
    setError('')
    const response = await window.api?.patchKnowledgeSource({
      url,
      id: source.id,
      title: encyclopediaTitleForSave(title, source),
      profileIds,
      moduleIds,
      updatedAt: source.updatedAt
    })
    setSaving(false)
    if (!response) {
      setError('Impossible de joindre le serveur.')
      return
    }
    if ('error' in response) {
      setError(response.error.message)
      return
    }
    onSaved(response.data.source)
    onClose()
  }

  const intakeTableName =
    source.fileType === 'intake'
      ? (intakeTableNameFromOriginalName(source.originalName) ?? source.originalName)
      : null
  const isIntake = intakeTableName !== null
  const officialTitle = officialEncyclopediaTitle(source)
  const tableName = intakeTableName ?? normalize_knowledge_name(title.trim() || officialTitle)
  const identity =
    source.fileType === 'xlsx'
      ? `${source.sheetName} · ${source.originalName}`
      : (intakeTableName ?? source.originalName)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent viewport="form" className="overflow-y-auto sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            Configurer {isIntake ? source.title : (source.sheetName ?? source.originalName)}
          </DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <FieldSet>
            <FieldLegend>
              {source.fileType === 'xlsx' ? 'Onglet' : isIntake ? 'Collecte' : 'Document'}
            </FieldLegend>
            <FieldDescription>
              {identity}
              {source.headerRow !== null ? ` · En-têtes ligne ${source.headerRow}` : null}
            </FieldDescription>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Contenu</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${fieldId}-title`}>Titre dans l’encyclopédie</FieldLabel>
                <Input
                  id={`${fieldId}-title`}
                  value={title}
                  placeholder={officialTitle}
                  disabled={source.coreDataTable !== null || isIntake}
                  onChange={(event) => setTitle(event.target.value)}
                />
                <FieldDescription>
                  {isIntake
                    ? 'Le nom et la suppression d’une collecte se gèrent depuis le module Collectes.'
                    : 'Nom sous lequel les assistants citent cette source.'}
                  {tableName ? ` Table pour l’agent : ${tableName}.` : null}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Profils autorisés</FieldLegend>
            <FieldDescription>
              Assistants qui ont le droit de lire cette source. Sans profil, elle n’est transmise à
              aucun assistant.
            </FieldDescription>
            <div className="grid grid-cols-2 gap-2">
              {profiles.map((profile) => (
                <Field key={profile.id} orientation="horizontal">
                  <Checkbox
                    id={`${fieldId}-${profile.id}`}
                    checked={profileIds.includes(profile.id)}
                    onCheckedChange={(checked) => toggleProfile(profile.id, checked === true)}
                  />
                  <FieldLabel htmlFor={`${fieldId}-${profile.id}`}>{profile.label}</FieldLabel>
                </Field>
              ))}
            </div>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Modules autorisés</FieldLegend>
            <FieldDescription>Métiers qui peuvent s’en servir.</FieldDescription>
            <div className="grid grid-cols-2 gap-2">
              {knowledgePublishModules().map((module) => (
                <Field key={module.id} orientation="horizontal">
                  <Checkbox
                    id={`${fieldId}-module-${module.id}`}
                    checked={moduleIds.includes(module.id)}
                    onCheckedChange={(checked) => toggleModule(module.id, checked === true)}
                  />
                  <FieldLabel htmlFor={`${fieldId}-module-${module.id}`}>{module.label}</FieldLabel>
                </Field>
              ))}
            </div>
          </FieldSet>

          {error ? <FieldError>{error}</FieldError> : null}
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <Spinner /> : null}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
