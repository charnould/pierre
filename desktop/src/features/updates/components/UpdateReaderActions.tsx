import { Check, Copy, ExternalLink } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { ButtonGroup } from '@/shared/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'

interface Props {
  copied: boolean
  copyDisabled: boolean
  onCopy: () => void
  onOpenGitHub: () => void
  className?: string
}

export function UpdateReaderActions({
  copied,
  copyDisabled,
  onCopy,
  onOpenGitHub,
  className
}: Props) {
  return (
    <ButtonGroup aria-label="Actions article" className={cn('shrink-0', className)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              disabled={copyDisabled}
              aria-label={copied ? 'Copié' : 'Copier le texte'}
              aria-pressed={copied || undefined}
              className={cn('text-muted-foreground', copied && 'text-foreground')}
              onClick={onCopy}
            />
          }
        >
          {copied ? <Check /> : <Copy />}
        </TooltipTrigger>
        <TooltipContent>{copied ? 'Copié' : 'Copier le texte'}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Voir sur GitHub"
              className="text-muted-foreground"
              onClick={onOpenGitHub}
            />
          }
        >
          <ExternalLink />
        </TooltipTrigger>
        <TooltipContent>Voir sur GitHub</TooltipContent>
      </Tooltip>
    </ButtonGroup>
  )
}
