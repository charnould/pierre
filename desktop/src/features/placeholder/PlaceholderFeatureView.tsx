import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { PANEL_IDENTITY } from '@/shared/lib/panel-identity'
import { PANEL_FLAGS } from '@/shared/lib/tab-registry'
import { cn } from '@/shared/lib/utils'

export const PLACEHOLDER_TABS = Object.keys(PANEL_FLAGS) as (keyof typeof PANEL_FLAGS)[]

type PlaceholderTab = (typeof PLACEHOLDER_TABS)[number]

const PLACEHOLDER_COPY: Record<PlaceholderTab, { description: string }> = {
  insurance: {
    description: 'Les attestations d’assurance seront disponibles ici.'
  },
  relocation: {
    description: 'La relocation sera disponible ici.'
  },
  attributions: {
    description: 'Les attributions seront disponibles ici.'
  },
  ventes: {
    description: 'Les ventes seront disponibles ici.'
  }
}

interface Props {
  hidden: boolean
  tab: PlaceholderTab
}

/** Placeholder until the workflow is implemented. */
export function PlaceholderFeatureView({ hidden, tab }: Props) {
  const { description } = PLACEHOLDER_COPY[tab]
  const Icon = PANEL_IDENTITY[tab].icon

  return (
    <div
      data-tab-panel
      className={cn('bg-background relative min-h-0 flex-1 flex-col', hidden ? 'hidden' : 'flex')}
    >
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle>Fonctionnalité en cours d'invention</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  )
}
