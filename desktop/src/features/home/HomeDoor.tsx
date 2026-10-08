import { Bot } from 'lucide-react'

import { PANEL_IDENTITY } from '@/shared/lib/panel-identity'
import { preloadTab } from '@/shared/lib/preload-tab'
import type { Tab } from '@/shared/lib/tab-registry'
import { cn } from '@/shared/lib/utils'

export type HomeDoorId = 'chat' | Tab

const DOOR_TONE: Partial<Record<HomeDoorId, string>> = {
  chat: 'bg-home-chat text-home-ink',
  tickets: 'bg-home-tickets text-home-ink',
  repayment: 'bg-home-repayment text-home-ink',
  automations: 'bg-home-automations text-home-ink',
  bulk: 'bg-home-bulk text-home-ink',
  about: 'bg-home-about text-home-ink',
  insurance: 'bg-home-insurance text-home-ink',
  relocation: 'bg-home-relocation text-home-ink',
  attributions: 'bg-home-attributions text-home-ink',
  ventes: 'bg-home-ventes text-home-ink'
}

const DOOR_HINT: Partial<Record<HomeDoorId, string>> = {
  chat: 'Poser à {name} une question sur vos pratiques, vos processus ou vos données.',
  tickets: 'Répondre aux candidats et aux locataires, puis coordonner le suivi avec votre équipe.',
  repayment: 'Suivre les impayés, organiser les relances et piloter les plans d’apurement.',
  automations: 'Définir quand et comment {name} intervient sur vos dossiers et vos données.',
  bulk: 'Préparer et envoyer des courriels, courriers, recommandés et messages RCS/SMS à plusieurs destinataires.',
  about: 'Préparer un rendez-vous, un appel ou une réunion avec une synthèse du dossier.',
  insurance: 'Suivre et relancer le renouvellement des attestations d’assurance habitation.',
  relocation: 'Coordonner la gestion locative et la remise en état jusqu’à la prochaine entrée.',
  attributions: 'Suivre les demandes et les étapes d’attribution.',
  ventes: 'Suivre les dossiers de vente et leurs prochaines étapes.'
}

export function doorHint(entry: HomeDoorId, name: string): string | undefined {
  return DOOR_HINT[entry]?.replaceAll('{name}', name)
}

/** Métier door. Not a ChoiceTile: it opens work, it is not a selected choice. */
export function HomeDoor({
  entry,
  agentName,
  onOpen
}: {
  entry: HomeDoorId
  agentName: string
  onOpen: () => void
}) {
  const identity =
    entry === 'chat' ? { icon: Bot, label: `Discuter avec ${agentName}` } : PANEL_IDENTITY[entry]
  const Icon = identity.icon
  const hint = doorHint(entry, agentName)
  return (
    <button
      type="button"
      data-door={entry}
      className={cn(
        'home-door flex aspect-[1.618] w-full min-w-0 cursor-pointer flex-col items-start gap-1 rounded-md px-4 py-3 text-start select-none',
        'focus-visible:ring-ring/20 focus-visible:ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        DOOR_TONE[entry] ?? 'bg-muted text-foreground'
      )}
      onPointerEnter={() => preloadTab(entry)}
      onClick={onOpen}
    >
      <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.5} />
      <span className="font-heading min-w-0 text-lg leading-6 font-medium text-balance">
        {identity.label}
      </span>
      {hint ? (
        <span className="line-clamp-3 font-serif text-sm leading-4.75 font-[350] text-balance">
          {hint}
        </span>
      ) : null}
    </button>
  )
}
