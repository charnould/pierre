import type { ComponentType, SVGProps } from 'react'

import {
  CartoonPersonLabellingContract,
  Docket,
  TenantBox
} from '@/shared/components/icons/koboyo-empty'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import type { Tab } from '@/shared/lib/tabs'
import { cn } from '@/shared/lib/utils'

export const PLACEHOLDER_TABS = [
  'insurance-attestation',
  'relocation',
  'attributions',
  'ventes'
] as const satisfies readonly Tab[]

type PlaceholderTab = (typeof PLACEHOLDER_TABS)[number]

const PLACEHOLDER_COPY: Record<
  PlaceholderTab,
  { description: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  'insurance-attestation': {
    description: 'Les attestations d’assurance seront disponibles ici.',
    Icon: CartoonPersonLabellingContract
  },
  relocation: {
    description: 'La relocation sera disponible ici.',
    Icon: TenantBox
  },
  attributions: {
    description: 'Les attributions seront disponibles ici.',
    Icon: Docket
  },
  ventes: {
    description: 'Les ventes seront disponibles ici.',
    Icon: CartoonPersonLabellingContract
  }
}

interface Props {
  hidden: boolean
  tab: PlaceholderTab
}

/** Placeholder until the workflow is implemented. */
export function PlaceholderFeatureView({ hidden, tab }: Props) {
  const { description, Icon } = PLACEHOLDER_COPY[tab]

  return (
    <div
      data-tab-panel
      className={cn('relative min-h-0 flex-1 flex-col bg-background', hidden ? 'hidden' : 'flex')}
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
