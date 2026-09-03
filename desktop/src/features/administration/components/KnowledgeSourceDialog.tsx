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
import type { KnowledgeEntry, KnowledgeProfile, KnowledgeSource } from '@/shared/types/knowledge'

import { normalize_knowledge_name } from '../../../../../shared/knowledge'
import { knowledgePublishModules, type BusinessModuleId } from '../../../../../shared/modules'

interface Props {
  url: string
  source: KnowledgeSource
  entryIndex: number
  coreDataTable: string | null
  profiles: KnowledgeProfile[]
  onClose: () => void
  onSaved: (source: KnowledgeSource) => void
}

export const replaceKnowledgeEntry = (
  entries: readonly KnowledgeEntry[],
  index: number,
  entry: KnowledgeEntry
): KnowledgeEntry[] =>
  entries.map((current, currentIndex) => (currentIndex === index ? entry : current))

export const officialEncyclopediaTitle = (
  source: Pick<KnowledgeSource, 'fileType' | 'originalName'>,
  entry: Pick<KnowledgeEntry, 'sheetName'>
): string =>
  source.fileType === 'xlsx'
    ? (entry.sheetName ?? source.originalName.replace(/\.[^.]+$/, ''))
    : source.originalName.replace(/\.[^.]+$/, '')

export const encyclopediaTitleForSave = (
  title: string,
  source: Pick<KnowledgeSource, 'fileType' | 'originalName'>,
  entry: Pick<KnowledgeEntry, 'sheetName'>
): string => title.trim() || officialEncyclopediaTitle(source, entry)

export function KnowledgeSourceDialog({
  url,
  source,
  entryIndex,
  coreDataTable,
  profiles,
  onClose,
  onSaved
}: Props) {
  const fieldId = useId()
  const entry = source.entries[entryIndex]!
  const [title, setTitle] = useState(entry.title)
  const [headerRow, setHeaderRow] = useState(entry.headerRow)
  const [profileIds, setProfileIds] = useState(entry.profileIds)
  const [moduleIds, setModuleIds] = useState(entry.moduleIds)
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
    const entries = replaceKnowledgeEntry(source.entries, entryIndex, {
      ...entry,
      title: encyclopediaTitleForSave(title, source, entry),
      headerRow,
      profileIds,
      moduleIds
    })
    const response = await window.api?.patchKnowledgeSource({
      url,
      id: source.id,
      entries,
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

  const officialTitle = officialEncyclopediaTitle(source, entry)
  const tableName = normalize_knowledge_name(encyclopediaTitleForSave(title, source, entry))
  const identity =
    source.fileType === 'xlsx' ? `${entry.sheetName} · ${source.originalName}` : source.originalName

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent viewport="form" className="overflow-y-auto sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>Configurer {entry.sheetName ?? source.originalName}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <FieldSet>
            <FieldLegend>{source.fileType === 'xlsx' ? 'Onglet' : 'Document'}</FieldLegend>
            <FieldDescription>{identity}</FieldDescription>
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
                  disabled={coreDataTable !== null}
                  onChange={(event) => setTitle(event.target.value)}
                />
                {tableName ? (
                  <FieldDescription>Table pour l’agent : {tableName}</FieldDescription>
                ) : null}
              </Field>
              {source.fileType === 'xlsx' ? (
                <Field>
                  <FieldLabel htmlFor={`${fieldId}-header`}>Ligne des en-têtes</FieldLabel>
                  <Input
                    id={`${fieldId}-header`}
                    type="number"
                    min={1}
                    value={(headerRow ?? 0) + 1}
                    onChange={(event) => setHeaderRow(Math.max(0, Number(event.target.value) - 1))}
                  />
                </Field>
              ) : null}
            </FieldGroup>
          </FieldSet>

          <FieldSet>
            <FieldLegend>Profils autorisés</FieldLegend>
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
