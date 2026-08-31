import { Building2, ExternalLink, Home, Layers, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { SettingsFieldOptionTile } from '@/features/settings/components/SettingsFieldOptionTile'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'

interface HistoricalApp {
  id: string
  icon: LucideIcon
  label: ReactNode
  description: string
}

const HISTORICAL_APPS: HistoricalApp[] = [
  {
    id: 'aravis',
    icon: Building2,
    label: (
      <>
        ACG Aravis<sup className="text-xs font-normal">®</sup>
      </>
    ),
    description: 'Agence Virtuelle'
  },
  {
    id: 'ulis-ikos',
    icon: Layers,
    label: (
      <>
        Sopra Steria<sup className="text-xs font-normal">®</sup>
      </>
    ),
    description: 'Ulis & Ikos'
  },
  {
    id: 'pih',
    icon: Home,
    label: (
      <>
        Aaereon<sup className="text-xs font-normal">®</sup>
      </>
    ),
    description: "PIH & Prem'Habitat"
  }
]

interface Props {
  agentName: string
}

export function HistoricalAppsConnectionField({ agentName }: Props) {
  const displayName = agentName.trim() || 'l’agent'

  return (
    <Field className="border-border rounded-md border p-4">
      <div className="flex flex-col gap-0.5">
        <FieldLabel>Applicatifs historiques (inactifs à ce stade)</FieldLabel>
        <FieldDescription>
          Pour que {displayName} agisse en votre nom. Identifiants et cookies restent sur cet
          ordinateur.
        </FieldDescription>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-2">
        {HISTORICAL_APPS.map((app) => {
          const Icon = app.icon

          return (
            <SettingsFieldOptionTile
              key={app.id}
              placeholder
              icon={<Icon strokeWidth={1.5} aria-hidden />}
              label={app.label}
              caption={app.description}
              signal={<ExternalLink strokeWidth={1.5} aria-hidden />}
            />
          )
        })}
      </div>
    </Field>
  )
}
