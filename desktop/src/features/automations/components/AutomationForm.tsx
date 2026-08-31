import { Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Fragment, useMemo, useState, type ReactNode } from 'react'

import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { OrgUserListItem } from '@/shared/components/OrgUserListItem'
import { Button } from '@/shared/components/ui/button'
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
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import { collaboratorSearchLabel, orgUserListName } from '@/shared/lib/org-user-list-item'
import { formatOrgCollaboratorLabel } from '@/shared/lib/org-users-cache'
import type { UiSettings } from '@/shared/lib/ui-settings/schema'

import {
  isReportAutomation,
  isTicketReplyAutomation,
  type Automation,
  type AutomationType,
  type TicketAutomationFilters,
  type TicketReplyChannel
} from '../lib/automation-types'
import { AutomationFormScheduleFields, normalizeFrequencyDay } from './AutomationFormScheduleFields'
import { AutomationReplyFormatCards } from './AutomationReplyFormatCards'
import { AutomationTicketFilters } from './AutomationTicketFilters'
import { AutomationTypeCards } from './AutomationTypeCards'
import { PromptMarkdownEditor } from './PromptMarkdownEditor'

const DEFAULT_MAX_ITEMS = 20

function CollaboratorChipAvatar({ login, name }: { login: string; name: string }) {
  const photoUrl = useUserAvatar(login)
  return (
    <UserAvatar photoUrl={photoUrl} name={name} login={login} size="sm" className="size-3.5!" />
  )
}

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
  uiSettings?: UiSettings
  automation?: Automation
  onCancel: () => void
  onSave: (data: Partial<Automation>) => void
  onLaunch?: () => void
  onTogglePause?: () => void
  onDelete?: () => void
}

function CollaboratorsCombobox({
  url,
  ownerLogin,
  value,
  onValueChange
}: {
  url: string | undefined
  ownerLogin: string
  value: string[]
  onValueChange: (logins: string[]) => void
}) {
  const anchor = useComboboxAnchor()
  const { users: orgUsers } = useOrgUsers(url)

  const usersByLogin = useMemo(
    () => new Map(orgUsers.map((user) => [user.login.toLowerCase(), user])),
    [orgUsers]
  )

  const items = useMemo(
    () =>
      [...orgUsers]
        .filter((user) => user.login !== ownerLogin)
        .sort((a, b) => a.login.localeCompare(b.login, 'fr'))
        .map((user) => user.login),
    [orgUsers, ownerLogin]
  )

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={value}
      onValueChange={(next) => onValueChange(next as string[])}
      itemToStringLabel={(login) => {
        const user = usersByLogin.get(login.toLowerCase())
        return user ? collaboratorSearchLabel(user) : login
      }}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <Fragment>
              {values.map((login: string) => {
                const user = usersByLogin.get(login.toLowerCase())
                const label = user ? orgUserListName(user) : formatOrgCollaboratorLabel(login)
                return (
                  <ComboboxChip key={login}>
                    <CollaboratorChipAvatar login={login} name={label} />
                    <span className="truncate">{label}</span>
                  </ComboboxChip>
                )
              })}
              <ComboboxChipsInput
                aria-label="Collaborateurs"
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
            const user = usersByLogin.get(login.toLowerCase())
            return (
              <ComboboxItem key={login} value={login}>
                {user ? (
                  <OrgUserListItem user={user} />
                ) : (
                  <OrgUserListItem name={formatOrgCollaboratorLabel(login)} login={login} />
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
  const [collaborators, setCollaborators] = useState<string[]>(automation?.mentions ?? [])
  const [maxReports, setMaxReports] = useState(
    automation && isReportAutomation(automation) ? automation.maxReports : 6
  )
  const [maxItems, setMaxItems] = useState(
    automation && isTicketReplyAutomation(automation) ? automation.maxItems : DEFAULT_MAX_ITEMS
  )
  const [channel, setChannel] = useState<TicketReplyChannel>(
    automation && isTicketReplyAutomation(automation) ? automation.channel : 'email'
  )
  const [ticketFilters, setTicketFilters] = useState<TicketAutomationFilters>(
    automation && isTicketReplyAutomation(automation) ? automation.ticketFilters : { rules: [] }
  )
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [formSource, setFormSource] = useState(automation)
  if (formSource !== automation) {
    setFormSource(automation)
    const nextFrequency = automation?.frequency ?? 'weekly'
    setName(automation?.name ?? '')
    setDescription(automation?.description ?? '')
    setFrequency(nextFrequency)
    setFrequencyDay(normalizeFrequencyDay(nextFrequency, automation?.frequencyDay))
    setFrequencyTime(automation?.frequencyTime ?? '08:00')
    setCollaborators(automation?.mentions ?? [])
    if (automation) {
      setAutomationType(automation.type)
      if (isReportAutomation(automation)) {
        setPrompt(automation.prompt)
        setMaxReports(automation.maxReports)
      }
      if (isTicketReplyAutomation(automation)) {
        setTicketFilters(automation.ticketFilters)
        setMaxItems(automation.maxItems)
        setChannel(automation.channel)
      }
    }
  }

  const resolvedType = automation?.type ?? automationType
  const isReport = resolvedType === 'report'

  const isPaused = automation?.status === 'paused'
  const ownerLogin = automation?.owner ?? 'gensel'
  const hasEditOps = isEdit && (onLaunch || onTogglePause || onDelete)

  function handleSubmit() {
    const base = {
      name,
      description,
      frequency: frequency as Automation['frequency'],
      frequencyDay,
      frequencyTime,
      mentions: collaborators
    }
    if (isReport) {
      onSave({ ...base, type: 'report', prompt, maxReports })
    } else {
      onSave({
        ...base,
        type: 'ticket_reply',
        skillId: 'ticket.answer-ticket',
        channel,
        ticketFilters,
        maxItems
      })
    }
  }

  return (
    <>
      <FieldSet className="w-full">
        <FieldGroup>
          {!isEdit ? (
            <AutomationTypeCards value={automationType} onValueChange={setAutomationType} />
          ) : null}

          <AutomationField
            id="auto-name"
            label="Nom"
            description="Affiché dans la liste des automatisations et le centre de notifications. N’influence pas le contenu produit."
          >
            <Input
              id="auto-name"
              aria-label="Nom"
              className="w-full"
              placeholder={
                isReport
                  ? 'Ex. : Points d’attention — prise d’astreinte'
                  : 'Ex. : Brouillons litiges locatifs'
              }
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

          {isReport ? (
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
                className="tabular-nums"
                value={maxReports}
                onChange={(e) => setMaxReports(Math.max(1, Number(e.target.value) || 1))}
              />
            </AutomationField>
          ) : (
            <AutomationReplyFormatCards value={channel} onValueChange={setChannel} />
          )}

          <AutomationField
            label="Fréquence"
            description={
              isReport ? (
                <>
                  La génération démarre approximativement à l’horaire indiqué. Selon la complexité,
                  elle peut prendre plusieurs minutes. Anticipez ce délai si vous avez besoin du
                  résultat à une heure précise.
                </>
              ) : (
                <>
                  La génération démarre approximativement à l’horaire indiqué. Selon la complexité,
                  elle peut prendre plusieurs minutes. Anticipez ce délai si vous avez besoin du
                  résultat à une heure précise. Recommandation&nbsp;: programmez l’exécution la
                  nuit, quand le volume de réclamations est plus faible.
                </>
              )
            }
          >
            <AutomationFormScheduleFields
              frequency={frequency}
              frequencyDay={frequencyDay}
              frequencyTime={frequencyTime}
              onFrequencyChange={setFrequency}
              onFrequencyDayChange={setFrequencyDay}
              onFrequencyTimeChange={setFrequencyTime}
            />
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

          {isReport ? (
            <AutomationField
              id="auto-prompt"
              label="Instructions"
              description={`Consignes envoyées à ${agentName} pour produire le rapport. Plus elles sont précises, plus le résultat est pertinent.`}
            >
              <PromptMarkdownEditor
                id="auto-prompt"
                value={prompt}
                onChange={setPrompt}
                placeholder="Décrivez le périmètre, les sources à consulter et le format attendu…"
              />
            </AutomationField>
          ) : (
            <>
              <AutomationTicketFilters
                url={url}
                uiSettings={uiSettings}
                value={ticketFilters}
                onChange={setTicketFilters}
              />
              <AutomationField
                id="auto-max-items"
                label="Limite"
                description="Nombre maximum de réclamations traitées à chaque exécution."
              >
                <Input
                  id="auto-max-items"
                  aria-label="Limite"
                  type="number"
                  min={1}
                  className="tabular-nums"
                  value={maxItems}
                  onChange={(e) => setMaxItems(Math.max(1, Number(e.target.value) || 1))}
                />
              </AutomationField>
            </>
          )}
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-row flex-wrap items-center gap-2">
        {hasEditOps ? (
          <div className="flex flex-row flex-wrap items-center gap-2">
            {onLaunch ? (
              <Button type="button" variant="outline" size="sm" onClick={onLaunch}>
                <RotateCcw data-icon="inline-start" />
                Lancer maintenant
              </Button>
            ) : null}
            {onTogglePause ? (
              <Button type="button" variant="outline" size="sm" onClick={onTogglePause}>
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
          <Button type="button" size="sm" onClick={handleSubmit}>
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
