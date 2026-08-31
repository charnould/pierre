import { MousePointerClick } from 'lucide-react'
import type { ComponentType } from 'react'

import { ClosedPadlock } from '@/shared/components/icons/koboyo-empty'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'

type Variant = 'none-selected' | 'collaborator'

interface Props {
  variant: Variant
  automationName?: string
  hasAutomations?: boolean
}

const COPY: Record<
  Variant,
  {
    icon: ComponentType<{ className?: string }>
    title: string
    description: (name?: string, hasAutomations?: boolean) => string
  }
> = {
  'none-selected': {
    icon: MousePointerClick,
    title: 'Aucune automatisation sélectionnée',
    description: (_name, hasAutomations) =>
      hasAutomations === false
        ? 'Créez une automatisation pour commencer.'
        : 'Sélectionnez une automatisation dans la liste pour la modifier.'
  },
  collaborator: {
    icon: ClosedPadlock,
    title: 'Modification non autorisée',
    description: (name) =>
      name
        ? `Vous n'êtes pas le propriétaire de « ${name} ». Les rapports générés sont disponibles dans les notifications. Rapprochez-vous du propriétaire si des ajustements sont souhaités.`
        : "Vous n'êtes pas le propriétaire de cette automatisation. Les rapports générés sont disponibles dans les notifications."
  }
}

export function AutomationDetailEmpty({ variant, automationName, hasAutomations }: Props) {
  const { icon: Icon, title, description } = COPY[variant]

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle className="text-sm leading-5 font-medium">{title}</EmptyTitle>
        <EmptyDescription>{description(automationName, hasAutomations)}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
