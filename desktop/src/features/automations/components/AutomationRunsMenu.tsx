import { ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useNotificationTimeline } from '@/features/activity/hooks/use-notification-timeline'
import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import {
  automationRunLimit,
  buildAutomationRunEntries
} from '@/features/automations/lib/automation-runs'
import type { Automation } from '@/features/automations/lib/automation-types'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'

interface Props {
  automation: Automation
  url?: string
  onOpenRun: (target: ReaderTarget) => void
}

function stopCardClick(event: React.SyntheticEvent) {
  event.stopPropagation()
}

export function AutomationRunsMenu({ automation, url, onOpenRun }: Props) {
  const [open, setOpen] = useState(false)
  const { rows, initialLoading } = useNotificationTimeline(url, 'automations', automation.id, open)

  const limit = automationRunLimit(automation)
  const entries = useMemo(
    () => buildAutomationRunEntries(automation, rows, limit),
    [automation, limit, rows]
  )

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="link"
            size="xs"
            className="text-muted-foreground hover:text-foreground h-auto shrink-0 p-0 font-normal"
            aria-label="Historique des rapports"
            onClick={stopCardClick}
            onPointerDown={stopCardClick}
          />
        }
      >
        Historique
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-48" onClick={stopCardClick}>
        <DropdownMenuGroup>
          {initialLoading ? (
            <DropdownMenuItem disabled>Chargement…</DropdownMenuItem>
          ) : entries.length === 0 ? (
            <DropdownMenuItem disabled>Aucun élément généré</DropdownMenuItem>
          ) : (
            entries.map((entry) => (
              <DropdownMenuItem
                key={entry.id}
                className="flex flex-col items-start gap-0.5"
                onClick={() => {
                  onOpenRun(entry.target)
                  setOpen(false)
                }}
              >
                <span className="text-foreground text-sm whitespace-nowrap tabular-nums">
                  {entry.label}
                </span>
                <span className="text-muted-foreground text-xs">{entry.subtitle}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
