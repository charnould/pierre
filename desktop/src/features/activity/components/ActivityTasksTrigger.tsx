import { SquareCheck } from 'lucide-react'

import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

export function ActivityTasksTrigger() {
  const { tasksOpen, setTasksOpen, openTasksRail } = useActivityRail()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="no-drag"
            aria-label="Tâches"
            aria-pressed={tasksOpen}
            onClick={() => (tasksOpen ? setTasksOpen(false) : openTasksRail('mine'))}
          />
        }
      >
        <SquareCheck />
      </TooltipTrigger>
      <TooltipContent side="bottom">Tâches</TooltipContent>
    </Tooltip>
  )
}
