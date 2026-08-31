import { Check, Copy, ExternalLink, X } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { ButtonGroup } from '@/shared/components/ui/button-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/lib/utils'

interface Props {
  copied: boolean
  copyDisabled: boolean
  onCopy: () => void
  onOpenGitHub?: () => void
  onClose?: () => void
  className?: string
}

export function UpdateReaderActions({
  copied,
  copyDisabled,
  onCopy,
  onOpenGitHub,
  onClose,
  className
}: Props) {
  return (
    <div
      role="toolbar"
      aria-label="Actions article"
      className={cn('flex shrink-0 items-center gap-2', className)}
    >
      <ButtonGroup>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={copyDisabled}
                aria-label={copied ? 'Copié' : 'Copier le texte'}
                aria-pressed={copied || undefined}
                onClick={onCopy}
              />
            }
          >
            {copied ? <Check /> : <Copy />}
          </TooltipTrigger>
          <TooltipContent>{copied ? 'Copié' : 'Copier le texte'}</TooltipContent>
        </Tooltip>

        {onOpenGitHub ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Voir sur GitHub"
                  onClick={onOpenGitHub}
                />
              }
            >
              <ExternalLink />
            </TooltipTrigger>
            <TooltipContent>Voir sur GitHub</TooltipContent>
          </Tooltip>
        ) : null}
      </ButtonGroup>

      {onClose ? (
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
          <X />
        </Button>
      ) : null}
    </div>
  )
}
