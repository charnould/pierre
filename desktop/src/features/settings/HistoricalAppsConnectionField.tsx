import { Building2, ExternalLink, Home, Layers, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  SETTINGS_CAPTION,
  SETTINGS_FIELD_LABEL,
  SETTINGS_FIELD_STACK
} from '@/features/settings/settings-chrome'
import { SettingsFieldOptionTile } from '@/features/settings/SettingsFieldOptionTile'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { FIELD_OPTION_GRID_CLASS } from '@/shared/lib/field-option-classes'

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
        ACG Aravis<sup className="text-[0.65em] font-normal">®</sup>
      </>
    ),
    description: 'Agence Virtuelle'
  },
  {
    id: 'ulis-ikos',
    icon: Layers,
    label: (
      <>
        Sopra Steria<sup className="text-[0.65em] font-normal">®</sup>
      </>
    ),
    description: 'Ulis & Ikos'
  },
  {
    id: 'pih',
    icon: Home,
    label: (
      <>
        Aaereon<sup className="text-[0.65em] font-normal">®</sup>
      </>
    ),
    description: "PIH & Prem'Habitat"
  }
]

interface Props {
  agentName: string
}

export function HistoricalAppsConnectionField({ agentName }: Props) {
  const displayName = agentName.trim() || "l'agent"

  return (
    <Field className={SETTINGS_FIELD_STACK}>
      <FieldLabel className={SETTINGS_FIELD_LABEL}>
        Connexion à vos applicatifs historiques
      </FieldLabel>
      <FieldDescription className={SETTINGS_CAPTION}>
        Connectez {displayName} à vos applicatifs historiques pour qu'il puisse agir en votre nom.
        Vos identifiants et cookies restent sur votre ordinateur, stockés uniquement en local.
      </FieldDescription>

      <div className={FIELD_OPTION_GRID_CLASS}>
        {HISTORICAL_APPS.map((app) => {
          const Icon = app.icon

          return (
            <SettingsFieldOptionTile
              key={app.id}
              placeholder
              icon={<Icon strokeWidth={1.75} aria-hidden />}
              label={app.label}
              caption={app.description}
              signal={<ExternalLink strokeWidth={1.75} aria-hidden />}
            />
          )
        })}
      </div>
    </Field>
  )
}
