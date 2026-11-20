import { DEFAULT_AUTOMATION_SCHEDULE, type RecurrenceSchedule } from '@pierre/shared/schedule'
import { Pause, Play, Plus, RotateCcw, Square, Trash2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { CollaboratorsCombobox } from '@/shared/components/CollaboratorsCombobox'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { ScheduleFields } from '@/shared/components/ScheduleFields'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Spinner } from '@/shared/components/ui/spinner'
import { Textarea } from '@/shared/components/ui/textarea'
import type { UiSettings } from '@/shared/lib/ui-settings/schema'

import { type Automation, isReportAutomation } from '../lib/automation-types'
import { PromptMarkdownEditor } from './PromptMarkdownEditor'

function AutomationField({
  id,
  label,
  description,
  children
}: {
  id?: string
  label: string
  description: ReactNode
  children: ReactNode
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      {children}
    </Field>
  )
}

interface AutomationFormProps {
  agentName: string
  url?: string
  userLogin?: string
  uiSettings?: UiSettings
  automation?: Automation
  onCancel: () => void
  onSave: (data: Partial<Automation>) => void
  onLaunch?: () => void
  onStopRun?: () => void
  onTogglePause?: () => void
  onDelete?: () => void
}

export function AutomationForm({
  agentName,
  url,
  userLogin = '',
  automation,
  onCancel,
  onSave,
  onLaunch,
  onStopRun,
  onTogglePause,
  onDelete
}: AutomationFormProps) {
  const isEdit = !!automation

  const [name, setName] = useState(automation?.name ?? '')
  const [description, setDescription] = useState(automation?.description ?? '')
  const [schedule, setSchedule] = useState<RecurrenceSchedule>(
    automation?.schedule ?? DEFAULT_AUTOMATION_SCHEDULE
  )
  const [prompt, setPrompt] = useState(
    automation && isReportAutomation(automation) ? automation.prompt : ''
  )
  const [collaborators, setCollaborators] = useState<string[]>(automation?.mentions ?? [])
  const [maxReports, setMaxReports] = useState(
    automation && isReportAutomation(automation) ? automation.maxReports : 6
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formSource, setFormSource] = useState(automation)
  if (formSource !== automation) {
    setFormSource(automation)
    setName(automation?.name ?? '')
    setDescription(automation?.description ?? '')
    setSchedule(automation?.schedule ?? DEFAULT_AUTOMATION_SCHEDULE)
    setCollaborators(automation?.mentions ?? [])
    if (automation && isReportAutomation(automation)) {
      setPrompt(automation.prompt)
      setMaxReports(automation.maxReports)
    }
  }

  const isPaused = automation?.status === 'paused'
  const isRunning = automation?.status === 'running'
  const ownerLogin = automation?.owner ?? userLogin
  const hasEditOps = isEdit && (onLaunch || onStopRun || onTogglePause || onDelete)

  function handleSubmit() {
    const base = {
      name,
      description,
      schedule,
      mentions: collaborators
    }
    onSave({ ...base, type: 'report', prompt, maxReports })
  }

  return (
    <>
      <FieldSet className="w-full">
        <FieldGroup>
          <AutomationField
            id="auto-name"
            label="Nom"
            description="Affiché dans la liste des automatisations et le centre de notifications. N’influence pas le contenu produit."
          >
            <Input
              id="auto-name"
              aria-label="Nom"
              className="w-full"
              placeholder="Ex. : Points d’attention — prise d’astreinte"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </AutomationField>

          <AutomationField
            id="auto-description"
            label="Description"
            description="Court résumé visible uniquement dans la liste des automatisations. N’influence pas le contenu produit."
          >
            <Textarea
              id="auto-description"
              aria-label="Description"
              placeholder="Ex. : Synthèse hebdomadaire pour l’équipe de permanence"
              className="resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </AutomationField>

          <AutomationField
            id="auto-max-reports"
            label="Rapports conservés"
            description="Nombre maximum de rapports gardés dans l’historique. Les plus anciens sont supprimés à la prochaine génération."
          >
            <Input
              id="auto-max-reports"
              aria-label="Rapports conservés"
              type="number"
              min={1}
              value={maxReports}
              onChange={(e) => setMaxReports(Math.max(1, Number(e.target.value) || 1))}
            />
          </AutomationField>

          <AutomationField
            label="Planification"
            description="La génération démarre approximativement à l’horaire indiqué. Selon la complexité, elle peut prendre plusieurs minutes. Anticipez ce délai si vous avez besoin du résultat à une heure précise."
          >
            <ScheduleFields idPrefix="auto-schedule" value={schedule} onChange={setSchedule} />
          </AutomationField>

          <AutomationField
            id="auto-collaborators"
            label="Collaborateurs"
            description="Personnes notifiées à chaque exécution. Le propriétaire n’apparaît pas dans cette liste."
          >
            <CollaboratorsCombobox
              url={url}
              ownerLogin={ownerLogin}
              value={collaborators}
              onValueChange={setCollaborators}
            />
          </AutomationField>

          <AutomationField
            id="auto-prompt"
            label="Instructions"
            description={`Prompt système envoyé à ${agentName} pour produire le rapport. Plus il est précis, plus le résultat est pertinent.`}
          >
            <PromptMarkdownEditor
              id="auto-prompt"
              value={prompt}
              onChange={setPrompt}
              placeholder="Décrivez le périmètre, les sources à consulter et le format attendu…"
            />
          </AutomationField>
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-row flex-wrap items-center gap-2">
        {hasEditOps ? (
          <div className="flex flex-row flex-wrap items-center gap-2">
            {isRunning ? (
              <>
                <Badge variant="secondary">
                  <Spinner data-icon="inline-start" />
                  En cours
                </Badge>
                {onStopRun ? (
                  <Button type="button" variant="outline" size="sm" onClick={onStopRun}>
                    <Square data-icon="inline-start" />
                    Interrompre
                  </Button>
                ) : null}
              </>
            ) : onLaunch ? (
              <Button type="button" variant="outline" size="sm" onClick={onLaunch}>
                <RotateCcw data-icon="inline-start" />
                Lancer maintenant
              </Button>
            ) : null}
            {onTogglePause ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isRunning}
                onClick={onTogglePause}
              >
                {isPaused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}
                {isPaused ? 'Réactiver' : 'Désactiver'}
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 data-icon="inline-start" />
                Supprimer
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="ms-auto flex flex-row items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" size="sm" disabled={isRunning} onClick={handleSubmit}>
            {isEdit ? (
              'Sauvegarder'
            ) : (
              <>
                <Plus data-icon="inline-start" />
                Programmer l'automatisation
              </>
            )}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="Supprimer cette automatisation ?"
        description={
          automation
            ? `« ${automation.name} » sera définitivement supprimée. Cette action est irréversible.`
            : 'Cette action est irréversible.'
        }
        confirmLabel="Supprimer"
        confirmVariant="destructive"
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          setDeleteDialogOpen(false)
          onDelete?.()
        }}
      />
    </>
  )
}
