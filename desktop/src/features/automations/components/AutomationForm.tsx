import { Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Card, CardBody, CardFooter } from '@/shared/components/ui/card'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from '@/shared/components/ui/combobox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { deskControlVariants } from '@/shared/lib/desk-control'
import { FIELD_CAPTION, FIELD_HEADING, FIELD_HEADING_GROUP } from '@/shared/lib/form-chrome'
import type { UiSettings } from '@/shared/lib/ui-settings/schema'
import { cn } from '@/shared/lib/utils'

import {
  AUTOMATION_TYPE_LABELS,
  isReportAutomation,
  isTicketReplyAutomation,
  type AutomationType,
  type TicketAutomationFilters
} from '../lib/automation-types'
import { AutomationTicketFilters } from './AutomationTicketFilters'
import { MOCK_ORG_USERS, orgUserEmail, type Automation } from './mock-data'

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel'
}

const DAYS_OF_WEEK = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function isWeekday(day: string | undefined): day is string {
  return !!day && DAYS_OF_WEEK.includes(day)
}

function isMonthDay(day: string | undefined): day is string {
  if (!day || !/^\d+$/.test(day)) return false
  const n = Number(day)
  return n >= 1 && n <= 28
}

function defaultFrequencyDay(frequency: string): string | undefined {
  switch (frequency) {
    case 'weekly':
      return 'lundi'
    case 'monthly':
      return '1'
    default:
      return undefined
  }
}

function normalizeFrequencyDay(frequency: string, day: string | undefined): string | undefined {
  switch (frequency) {
    case 'weekly':
      return isWeekday(day) ? day : 'lundi'
    case 'monthly':
      return isMonthDay(day) ? day : '1'
    default:
      return undefined
  }
}

interface AutomationFormProps {
  agentName: string
  url?: string
  uiSettings?: UiSettings
  automation?: Automation
  onCancel: () => void
  onSave: (data: Partial<Automation>) => void
  onLaunch?: () => void
  onTogglePause?: () => void
  onDelete?: () => void
}

function AutomationField({
  id,
  label,
  description,
  className,
  children
}: {
  id?: string
  label: string
  description: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <Field className={className}>
      <div className={FIELD_HEADING_GROUP}>
        <FieldLabel htmlFor={id} className={FIELD_HEADING}>
          {label}
        </FieldLabel>
        <FieldDescription className={FIELD_CAPTION}>{description}</FieldDescription>
      </div>
      {children}
    </Field>
  )
}

function CollaboratorsCombobox({
  ownerLogin,
  value,
  onValueChange
}: {
  ownerLogin: string
  value: string[]
  onValueChange: (logins: string[]) => void
}) {
  const anchor = useComboboxAnchor()

  const usersByLogin = useMemo(() => new Map(MOCK_ORG_USERS.map((user) => [user.login, user])), [])

  const items = useMemo(
    () =>
      [...MOCK_ORG_USERS]
        .filter((user) => user.login !== ownerLogin)
        .sort((a, b) => a.login.localeCompare(b.login, 'fr'))
        .map((user) => user.login),
    [ownerLogin]
  )

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={value}
      onValueChange={(next) => onValueChange(next as string[])}
    >
      <ComboboxChips
        ref={anchor}
        className={cn('w-full', deskControlVariants({ variant: 'desk' }))}
      >
        <ComboboxValue>
          {(values) => (
            <Fragment>
              {values.map((login) => (
                <ComboboxChip key={login}>{login}</ComboboxChip>
              ))}
              <ComboboxChipsInput
                placeholder={values.length === 0 ? 'Rechercher un collaborateur…' : undefined}
              />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>Aucun utilisateur trouvé.</ComboboxEmpty>
        <ComboboxList>
          {(login) => {
            const user = usersByLogin.get(login)
            return (
              <ComboboxItem
                key={login}
                value={login}
                className="flex-col items-start gap-0.5 py-1.5"
              >
                <span className="truncate">{login}</span>
                {user && (
                  <span className="text-muted-foreground truncate text-xs">
                    {orgUserEmail(login)}
                  </span>
                )}
              </ComboboxItem>
            )
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function AutomationForm({
  agentName,
  url,
  uiSettings,
  automation,
  onCancel,
  onSave,
  onLaunch,
  onTogglePause,
  onDelete
}: AutomationFormProps) {
  const isEdit = !!automation

  const [automationType, setAutomationType] = useState<AutomationType>(automation?.type ?? 'report')
  const [name, setName] = useState(automation?.name ?? '')
  const [description, setDescription] = useState(automation?.description ?? '')
  const [frequency, setFrequency] = useState<string>(automation?.frequency ?? 'weekly')
  const [frequencyDay, setFrequencyDay] = useState<string | undefined>(() =>
    normalizeFrequencyDay(automation?.frequency ?? 'weekly', automation?.frequencyDay)
  )
  const [frequencyTime, setFrequencyTime] = useState(automation?.frequencyTime ?? '08:00')
  const [prompt, setPrompt] = useState(
    automation && isReportAutomation(automation) ? automation.prompt : ''
  )
  const [collaborators, setCollaborators] = useState<string[]>(automation?.collaborators ?? [])
  const [maxReports, setMaxReports] = useState(
    automation && isReportAutomation(automation) ? automation.maxReports : 6
  )
  const [maxRuns, setMaxRuns] = useState(
    automation && isTicketReplyAutomation(automation) ? automation.maxRuns : 6
  )
  const [ticketFilters, setTicketFilters] = useState<TicketAutomationFilters>(
    automation && isTicketReplyAutomation(automation) ? automation.ticketFilters : { rules: [] }
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const resolvedType = automation?.type ?? automationType
  const isReport = resolvedType === 'report'

  useEffect(() => {
    const nextFrequency = automation?.frequency ?? 'weekly'
    setName(automation?.name ?? '')
    setDescription(automation?.description ?? '')
    setFrequency(nextFrequency)
    setFrequencyDay(normalizeFrequencyDay(nextFrequency, automation?.frequencyDay))
    setFrequencyTime(automation?.frequencyTime ?? '08:00')
    setCollaborators(automation?.collaborators ?? [])
    if (automation) {
      setAutomationType(automation.type)
      if (isReportAutomation(automation)) {
        setPrompt(automation.prompt)
        setMaxReports(automation.maxReports)
      }
      if (isTicketReplyAutomation(automation)) {
        setTicketFilters(automation.ticketFilters)
        setMaxRuns(automation.maxRuns)
      }
    }
  }, [automation])

  function handleFrequencyChange(nextFrequency: string) {
    setFrequency(nextFrequency)
    setFrequencyDay(
      normalizeFrequencyDay(nextFrequency, frequencyDay) ?? defaultFrequencyDay(nextFrequency)
    )
  }

  const isPaused = automation?.status === 'paused'
  const ownerLogin = automation?.owner ?? 'gensel'

  return (
    <>
      <div className="desk-form-panel">
        <Card variant="chrome">
          <CardBody inset="chrome" className="workflow-context-form desk-pane-scroll">
            <div className="automations-form-intro">
              <div className={FIELD_HEADING_GROUP}>
                <h2 className={FIELD_HEADING}>
                  {isEdit ? `Modifier « ${automation.name} »` : 'Nouvelle automatisation'}
                </h2>
                <p className={FIELD_CAPTION}>
                  {isEdit ? (
                    <>
                      Propriétaire ·{' '}
                      <span className="text-desk-label font-medium">{ownerLogin}</span>
                    </>
                  ) : isReport ? (
                    'Configurez la planification et le prompt du rapport.'
                  ) : (
                    'Planifiez les réponses automatiques sur les réclamations filtrées.'
                  )}
                </p>
              </div>
            </div>

            <FieldGroup className="gap-3.5">
              {!isEdit ? (
                <AutomationField
                  label="Type"
                  description="Le type ne peut pas être modifié après création."
                >
                  <Select
                    value={automationType}
                    onValueChange={(v) => {
                      if (v === 'report' || v === 'ticket_reply') setAutomationType(v)
                    }}
                  >
                    <SelectTrigger variant="desk" className="w-full max-w-xs">
                      <span className="flex-1 text-left">
                        {automationType === 'report' ? 'Rapport' : 'Réponses réclamations'}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="report">Rapport</SelectItem>
                      <SelectItem value="ticket_reply">Réponses réclamations</SelectItem>
                    </SelectContent>
                  </Select>
                </AutomationField>
              ) : (
                <AutomationField label="Type" description="Type d'automatisation (non modifiable).">
                  <Input
                    variant="desk"
                    className="max-w-xs"
                    readOnly
                    value={AUTOMATION_TYPE_LABELS[resolvedType]}
                  />
                </AutomationField>
              )}

              <AutomationField
                id="auto-name"
                label="Nom"
                description="Nom affiché dans la liste des automatisations."
              >
                <Input
                  id="auto-name"
                  variant="desk"
                  placeholder="Ex : Rapport RH hebdo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </AutomationField>

              <AutomationField
                id="auto-description"
                label="Description"
                description="Résumé court visible sous le titre dans la liste."
              >
                <Input
                  id="auto-description"
                  variant="desk"
                  placeholder="Ex : Synthèse de l'activité du service RH"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </AutomationField>

              <AutomationField
                label="Fréquence"
                description={
                  isReport ? (
                    <>
                      Planification des générations automatiques de rapports.
                      <br />
                      La génération peut prendre plusieurs minutes selon la complexité et la
                      longueur du rapport à générer.
                    </>
                  ) : (
                    <>
                      Planification des réponses automatiques (brouillons email).
                      <br />
                      Chaque exécution traite les réclamations éligibles selon les filtres
                      configurés.
                    </>
                  )
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={frequency} onValueChange={handleFrequencyChange}>
                    <SelectTrigger variant="desk" className="w-36">
                      <span className="flex-1 text-left">
                        {FREQUENCY_LABELS[frequency] ?? frequency}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidien</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                      <SelectItem value="monthly">Mensuel</SelectItem>
                    </SelectContent>
                  </Select>

                  {frequency === 'weekly' && frequencyDay && (
                    <Select value={frequencyDay} onValueChange={setFrequencyDay}>
                      <SelectTrigger variant="desk" className="w-32">
                        <span className="flex-1 text-left capitalize">
                          {frequencyDay ?? 'Jour'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {frequency === 'monthly' && frequencyDay && (
                    <Select value={frequencyDay} onValueChange={setFrequencyDay}>
                      <SelectTrigger variant="desk" className="w-28">
                        <span className="flex-1 text-left">
                          {frequencyDay ? `Le ${frequencyDay}` : 'Jour'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => String(i + 1)).map((d) => (
                          <SelectItem key={d} value={d}>
                            Le {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <span className="text-muted-foreground/70 px-0.5 text-xs">vers</span>
                  <Input
                    id="auto-frequency-time"
                    type="time"
                    variant="desk"
                    className="w-[5.5rem] appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    value={frequencyTime}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.currentTarget.focus()
                    }}
                    onChange={(e) => setFrequencyTime(e.target.value)}
                  />
                </div>
              </AutomationField>

              {isReport ? (
                <AutomationField
                  id="auto-max-reports"
                  label="Nombre de rapports à conserver"
                  description="Les rapports les plus récents sont conservés au-delà de cette limite. Une réduction prend effet à la prochaine génération."
                >
                  <div className="flex w-fit items-center gap-2">
                    <Input
                      id="auto-max-reports"
                      type="number"
                      min={1}
                      variant="desk"
                      className="w-16 text-center tabular-nums"
                      value={maxReports}
                      onChange={(e) => setMaxReports(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                </AutomationField>
              ) : (
                <AutomationField
                  id="auto-max-runs"
                  label="Nombre d'exécutions à conserver"
                  description="Les exécutions les plus récentes sont conservées au-delà de cette limite."
                >
                  <div className="flex w-fit items-center gap-2">
                    <Input
                      id="auto-max-runs"
                      type="number"
                      min={1}
                      variant="desk"
                      className="w-16 text-center tabular-nums"
                      value={maxRuns}
                      onChange={(e) => setMaxRuns(Math.max(1, Number(e.target.value) || 1))}
                    />
                  </div>
                </AutomationField>
              )}

              <AutomationField
                id="auto-collaborators"
                label="Collaborateurs"
                description={
                  isReport
                    ? "Collaborateurs ayant accès en lecture seule aux rapports générés. Le propriétaire n'apparaît pas ici."
                    : "Collaborateurs ayant accès en lecture seule à l'historique d'exécution."
                }
              >
                <CollaboratorsCombobox
                  ownerLogin={ownerLogin}
                  value={collaborators}
                  onValueChange={setCollaborators}
                />
              </AutomationField>
            </FieldGroup>

            {isReport ? (
              <AutomationField
                id="auto-prompt"
                className="mt-3.5 flex min-h-0 flex-col"
                label="Prompt"
                description={`Instructions envoyées à ${agentName} pour produire le rapport.`}
              >
                <Textarea
                  id="auto-prompt"
                  variant="desk"
                  placeholder="Décris ce que l'automatisation doit produire…"
                  className="min-h-48 resize-y leading-relaxed"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </AutomationField>
            ) : (
              <div className="mt-3.5 space-y-3.5">
                <AutomationField
                  label="Format de réponse"
                  description="Skill appelée pour chaque réclamation éligible (sans brouillon existant)."
                >
                  <Input
                    variant="desk"
                    className="max-w-md"
                    readOnly
                    value="Réponse numérique (email)"
                  />
                </AutomationField>
                <AutomationTicketFilters
                  url={url}
                  uiSettings={uiSettings}
                  value={ticketFilters}
                  onChange={setTicketFilters}
                />
              </div>
            )}
          </CardBody>

          <CardFooter inset="chrome" className="automations-form-footer">
            <div className="flex flex-wrap items-center gap-2">
              {isEdit && onLaunch && (
                <Button variant="outline" onClick={onLaunch}>
                  <RotateCcw />
                  Lancer maintenant
                </Button>
              )}
              {isEdit && onTogglePause && (
                <Button variant="outline" onClick={onTogglePause}>
                  {isPaused ? <Play /> : <Pause />}
                  {isPaused ? 'Réactiver' : 'Désactiver'}
                </Button>
              )}
              {isEdit && onDelete && (
                <Button variant="destructive-outline" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 />
                  Supprimer
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onCancel}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  const base = {
                    name,
                    description,
                    frequency: frequency as Automation['frequency'],
                    frequencyDay,
                    frequencyTime,
                    collaborators
                  }
                  if (isReport) {
                    onSave({ ...base, type: 'report', prompt, maxReports })
                  } else {
                    onSave({
                      ...base,
                      type: 'ticket_reply',
                      skillId: 'ticket.answer-ticket',
                      ticketFilters,
                      maxRuns
                    })
                  }
                }}
              >
                {isEdit ? (
                  'Sauvegarder'
                ) : (
                  <>
                    <Plus />
                    Créer l'automatisation
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer cette automatisation&nbsp;?</DialogTitle>
            <DialogDescription>
              {automation
                ? `« ${automation.name} » sera définitivement supprimée, ainsi que l'historique de ses ${isReportAutomation(automation) ? 'rapports' : 'exécutions'}. Cette action est irréversible.`
                : 'Cette action est irréversible.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false)
                onDelete?.()
              }}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
