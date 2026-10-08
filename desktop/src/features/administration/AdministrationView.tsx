import { ArrowLeft, Circle, CircleCheck } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import type { SetupEntry } from '@/shared/lib/instance-customization'
import { consumeSetupRequest, useSetupRequest } from '@/shared/lib/open-setup'
import { cn } from '@/shared/lib/utils'
import type { UserPrincipal } from '@/shared/types/users'

import { ConversationsPanel } from './components/ConversationsPanel'
import { KnowledgePanel } from './components/KnowledgePanel'
import { LlmStatisticsPanel } from './components/LlmStatisticsPanel'
import { ProvidersPanel } from './components/ProvidersPanel'
import { ENTRIES, type EntryId, SetupPanel } from './components/SetupPanel'
import { UsersPanel } from './components/UsersPanel'

const SECTIONS = [
  {
    id: 'users',
    label: 'Utilisateurs',
    hint: "Gérer qui peut se connecter à l’application, qui peut accéder à quels modules et quels profils d'agents, et qui est administrateur.",
    action: 'Gérer les utilisateurs'
  },
  {
    id: 'knowledge',
    label: 'Encyclopédie',
    hint: "Définir quels modules et quels agents peut accéder à quels fichiers de l'encyclopédie.",
    action: "Gérer l'encyclopédie"
  },
  {
    id: 'conversations',
    label: 'Conversations',
    hint: "Consulter les conversations entre les utilisateurs, clients, locataires et les agents pour identifier les éventuels manques de l'encylcopédie ou manques dans les consignes de l'agent.",
    action: 'Consulter les conversations'
  },
  {
    id: 'statistics',
    label: 'Statistiques',
    hint: "Suivre la consommations de tokens selon les différents types d'usage et la projection de la consommation pour le mois afin d'anticiper les besoins et les coûts.",
    action: 'Consulter les statistiques'
  },
  {
    id: 'providers',
    label: 'Prestataires',
    hint: "Paramétrer le nom de l'agent à travers l'application, le fuseau horaire, l'IA/le modèle de langage par défaut, les canaux RCS/SMS et email ouverts chez CM.com, les canaux courrier postal et signautre électronique ouverts chez La Poste.",
    action: 'Paramétrer'
  }
] as const

type SectionId = (typeof SECTIONS)[number]['id']
type Screen = SectionId | EntryId

const ACCESS_IDS = [
  'users',
  'knowledge',
  'conversations',
  'statistics'
] as const satisfies readonly SectionId[]
const PROVIDER_IDS = ['providers'] as const satisfies readonly SectionId[]

function sectionsFor(ids: readonly SectionId[]) {
  return ids.map((id) => SECTIONS.find((section) => section.id === id)!)
}

const SETUP_HINT: Record<EntryId, string> = {
  'chatbots/default':
    "Paramétrer l'agent conversationnel public et ceux spécialisés et à l'usage unique des collaborateurs de l'organisme.",
  tickets: 'Paramétrer le module « Impayés ».',
  repayment:
    'Phases du recouvrement, consigne de l’agent, courrier du plan d’apurement et modèles de relance.',
  'about/AGENTS.md': 'Consigne du briefing d’un locataire, d’un client, d’un lot ou d’un bâtiment.',
  'automations/AGENTS.md': 'Consigne suivie quand une automatisation rédige un rapport.'
}

const SETUP_FROM_REQUEST: Record<SetupEntry, EntryId> = {
  chatbot: 'chatbots/default',
  tickets: 'tickets',
  repayment: 'repayment',
  about: 'about/AGENTS.md',
  automations: 'automations/AGENTS.md'
}

interface Props {
  hidden: boolean
  url: string
  user: UserPrincipal
  onHome: () => void
  onCurrentUserPasswordChange: () => Promise<void>
  onUserChange: (user: UserPrincipal) => void
}

function ModuleState({ ready }: { ready: boolean }) {
  return (
    <span className="flex items-center gap-1">
      {ready ? (
        <CircleCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
      ) : (
        <Circle aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
      )}
      <span className="text-muted-foreground text-xs leading-4">
        {ready ? 'Paramétré' : 'À paramétrer'}
      </span>
    </span>
  )
}

function AdminGroup({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const titleId = `admin-group-${id}`
  return (
    <section aria-labelledby={titleId}>
      <Card>
        <CardHeader>
          <CardTitle id={titleId}>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup variant="rows">{children}</FieldGroup>
        </CardContent>
      </Card>
    </section>
  )
}

function AdminEntry({
  id,
  label,
  hint,
  action,
  ready,
  onClick
}: {
  id: string
  label: string
  hint: string
  action: string
  ready?: boolean
  onClick: () => void
}) {
  return (
    <Field orientation="horizontal" data-admin-entry={id}>
      <FieldContent>
        <FieldLabel>{label}</FieldLabel>
        <FieldDescription>{hint}</FieldDescription>
      </FieldContent>
      <div className="flex items-center justify-end gap-4">
        {ready === undefined ? null : <ModuleState ready={ready} />}
        <Button type="button" variant="outline" aria-label={`${action} ${label}`} onClick={onClick}>
          {action}
        </Button>
      </div>
    </Field>
  )
}

export function AdministrationView({
  hidden,
  url,
  user,
  onHome,
  onCurrentUserPasswordChange,
  onUserChange
}: Props) {
  const request = useSetupRequest()
  const [screen, setScreen] = useState<Screen | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [ready, setReady] = useState<Record<string, boolean> | null>(null)
  const current = request ? SETUP_FROM_REQUEST[request] : screen

  function leave() {
    if (current === 'conversations' && conversationId) {
      setConversationId(null)
      return
    }
    if (request) consumeSetupRequest()
    setConversationId(null)
    setScreen(null)
  }

  useEffect(() => {
    if (current !== null || !url) return
    let cancelled = false
    void (window.api?.getAdminSetup?.({ url }) ?? Promise.resolve(null)).then((response) => {
      if (!cancelled && response) setReady(response.ready)
    })
    return () => {
      cancelled = true
    }
  }, [current, url])

  function openPanel(opened: Screen): ReactNode {
    switch (opened) {
      case 'users':
        return (
          <UsersPanel
            url={url}
            user={user}
            onBack={leave}
            onCurrentUserPasswordChange={onCurrentUserPasswordChange}
            onUserChange={onUserChange}
          />
        )
      case 'knowledge':
        return <KnowledgePanel url={url} onBack={leave} />
      case 'conversations':
        return (
          <ConversationsPanel
            url={url}
            conversationId={conversationId}
            onBack={leave}
            onOpen={setConversationId}
          />
        )
      case 'statistics':
        return <LlmStatisticsPanel url={url} onBack={leave} />
      case 'providers':
        return <ProvidersPanel url={url} moduleIds={user.moduleIds} onBack={leave} />
      default:
        return <SetupPanel url={url} entryId={opened} onBack={leave} />
    }
  }

  return (
    <div
      data-tab-panel
      className={cn(
        'bg-background relative min-h-0 min-w-0 flex-1 flex-col',
        hidden ? 'hidden' : 'flex',
        current === null ? 'overflow-y-auto' : 'overflow-hidden'
      )}
    >
      {current === null ? (
        <div className="px-4 py-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Retour"
                onClick={onHome}
              >
                <ArrowLeft />
              </Button>
              <h1 className="font-serif text-4xl leading-tight font-normal">Administration</h1>
            </div>
            <nav aria-label="Administration" className="flex flex-col gap-4">
              <AdminGroup id="access" title="Accès et suivi">
                {sectionsFor(ACCESS_IDS).map((section) => (
                  <AdminEntry
                    key={section.id}
                    id={section.id}
                    label={section.label}
                    hint={section.hint}
                    action={section.action}
                    onClick={() => setScreen(section.id)}
                  />
                ))}
              </AdminGroup>
              <AdminGroup id="providers" title="Prestataires">
                {sectionsFor(PROVIDER_IDS).map((section) => (
                  <AdminEntry
                    key={section.id}
                    id={section.id}
                    label={section.label}
                    hint={section.hint}
                    action={section.action}
                    onClick={() => setScreen(section.id)}
                  />
                ))}
              </AdminGroup>
              <AdminGroup id="modules" title="Modules">
                {ENTRIES.map((entry) => (
                  <AdminEntry
                    key={entry.id}
                    id={entry.id}
                    label={entry.label}
                    hint={SETUP_HINT[entry.id]}
                    action="Paramétrer"
                    ready={ready ? ready[entry.id] === true : undefined}
                    onClick={() => setScreen(entry.id)}
                  />
                ))}
              </AdminGroup>
            </nav>
          </div>
        </div>
      ) : (
        openPanel(current)
      )}
    </div>
  )
}
