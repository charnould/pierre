import { PANEL_BG_CLASS } from '@/features/workflow/components/WorkflowPanelChrome'
import { PANEL_IDENTITY } from '@/shared/lib/panel-identity'
import type { Tab } from '@/shared/lib/tabs'
import { cn } from '@/shared/lib/utils'

export const PLACEHOLDER_TABS = [
  'repayment',
  'insurance-attestation',
  'relocation'
] as const satisfies readonly Tab[]

export type PlaceholderTab = (typeof PLACEHOLDER_TABS)[number]

interface Props {
  hidden: boolean
  tab: PlaceholderTab
}

/** Placeholder until the workflow is implemented. */
export function PlaceholderFeatureView({ hidden, tab }: Props) {
  const identity = PANEL_IDENTITY[tab]!
  const Icon = identity.icon

  return (
    <div
      className={cn(
        'tab-panel relative min-h-0 flex-1 flex-col',
        PANEL_BG_CLASS,
        hidden ? 'hidden' : 'flex'
      )}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
        <Icon aria-hidden className="text-muted-foreground/50" size={360} strokeWidth={1} />
        <p className="text-muted-foreground text-lg">Fonctionnalité en cours d'invention</p>
      </div>
    </div>
  )
}
