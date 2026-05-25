import { PANEL_BG_CLASS } from '@/components/workflow/WorkflowPanelChrome'
import { cn } from '@/lib/utils'

import type { Tab } from '../../lib/tabs'
import type { Settings } from '../../types'

interface Props {
  hidden: boolean
  settings: Settings
  onNavigate: (tab: Tab) => void
  agentName: string
}

/** Placeholder until the repayment plan workflow is reimplemented. */
export function RepaymentPlan({ hidden }: Pick<Props, 'hidden'>) {
  return (
    <div
      className={cn(
        'tab-panel relative min-h-0 flex-1 flex-col',
        PANEL_BG_CLASS,
        hidden ? 'hidden' : 'flex'
      )}
    >
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-lg">TODO</p>
      </div>
    </div>
  )
}
