import { MessageSquare } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

interface Props {
  open: boolean
  onToggle: () => void
}

export function ChatWindowTrigger({ open, onToggle }: Props) {
  return (
    <span className="no-drag flex">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Discussion rapide"
              aria-expanded={open}
              onClick={onToggle}
            />
          }
        >
          <MessageSquare />
        </TooltipTrigger>
        <TooltipContent side="bottom">Discussion rapide</TooltipContent>
      </Tooltip>
    </span>
  )
}
