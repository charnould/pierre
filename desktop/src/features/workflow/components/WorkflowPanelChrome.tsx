import { Check, Copy, ExternalLink, FileDown, Plus, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/shared/components/ui/button'
import { ButtonGroup } from '@/shared/components/ui/button-group'
import { Field, FieldDescription, FieldLabel } from '@/shared/components/ui/field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { formatThinkingMessage } from '@/shared/lib/thinking-message'
import { resolveTicketUrl } from '@/shared/lib/ticket-url'
import { cn } from '@/shared/lib/utils'

export const PANEL_BG_CLASS = 'bg-background'
export const PANEL_CONTENT_MAX_W = 'max-w-[770px]'
/** Answer workflow output (analyse + réponse) — wider than the form column */
export const ANSWER_OUTPUT_CONTENT_MAX_W = 'max-w-[1000px]'

export interface FileEntry {
  name: string
  size: number
  file: File
}

export function mergeUniqueFiles(prev: FileEntry[], incoming: File[]): FileEntry[] {
  const next = [...prev]
  for (const f of incoming) {
    if (!next.some((c) => c.name === f.name && c.size === f.size)) {
      next.push({ name: f.name, size: f.size, file: f })
    }
  }
  return next
}

export const EASE = [0.22, 1, 0.36, 1] as const
export const EASE_IN = [0.4, 0, 1, 1] as const

export const panelScreen = {
  hidden: { opacity: 0, y: 18, transition: { duration: 0.22, ease: EASE_IN } },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } }
}

export const panelScreenChild = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } }
}

export const panelContentStagger = {
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } }
}

export const resultEntrance = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }
  }
}

export const WORKFLOW_TOOLBAR_LABEL = 'm-0 p-0 text-sm font-medium text-muted-foreground'

export const WORKFLOW_FORM_CLASS =
  'rounded-lg border border-border bg-card text-card-foreground shadow-sm'

/** Centers the workflow form in the panel while step === 'form' */
export const WORKFLOW_FORM_STAGE_CLASS =
  'flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto'

export const WORKFLOW_FORM_INNER_CLASS = 'flex flex-col gap-3 p-3.5 pb-3'

export const WORKFLOW_FORM_ANSWER_CLASS =
  'shadow-[0_1px_2px_rgb(0_0_0/0.05),0_4px_12px_rgb(0_0_0/0.04)]'

export const WORKFLOW_FORM_ANSWER_INNER_CLASS = 'flex flex-col gap-3.5 px-[18px] pt-4 pb-3.5'

export const WORKFLOW_INPUT_CLASS = 'w-full min-w-0'

export const WORKFLOW_TEXTAREA_CLASS = 'min-h-[88px] w-full min-w-0'

export const WORKFLOW_ANSWER_TEXTAREA_CLASS = 'min-h-[132px]'

export const WORKFLOW_FORM_LEGEND_CLASS = 'm-0 text-xs leading-snug text-muted-foreground'

export const WORKFLOW_TOOLBAR_GROUP_CLASS = 'flex flex-row flex-wrap items-end gap-x-4 gap-y-3'

export const WORKFLOW_SELECT_TRIGGER_CLASS =
  'w-full min-w-0 [&_[data-slot=select-value]]:line-clamp-none'

export const WORKFLOW_ARTIFACT_TITLE_CLASS =
  'm-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground'

/** Panneau Contexte tickets — densité alignée sur AUTO_PANEL (automations-chrome). */
export const WORKFLOW_CONTEXT_PANEL_CLASS = 'px-4 py-2.5'

export const WORKFLOW_FIELD_CAPTION_CLASS = 'text-xs leading-snug text-muted-foreground'

export function workflowThinkingMessage(duration?: number) {
  return formatThinkingMessage(WORKFLOW_TOOLBAR_LABEL, duration)
}

export function workflowReasoningTitle(agentName: string): string {
  return `Raisonnement de ${agentName}`
}

export const WORKFLOW_REASONING_TOGGLE_CLASS =
  'm-0 text-[0.8125rem] font-normal leading-snug text-muted-foreground'

export function workflowReasoningToggleLabel(agentName: string): string {
  return `Raisonnement de ${agentName}`
}

export function workflowReasoningToggleDescription(): string {
  return 'Cliquer pour afficher le raisonnement'
}

export function workflowReasoningToggleMessage(agentName: string, duration?: number): ReactNode {
  const label = workflowReasoningToggleLabel(agentName)
  if (duration === undefined) {
    return <span className={WORKFLOW_REASONING_TOGGLE_CLASS}>{label}</span>
  }
  return (
    <span className={WORKFLOW_REASONING_TOGGLE_CLASS}>
      {label}
      <span className="text-muted-foreground/70 tabular-nums"> · {duration}&nbsp;s</span>
    </span>
  )
}

export function WorkflowFormField({
  label,
  description,
  htmlFor,
  children,
  className
}: {
  label: string
  description?: ReactNode
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Field className={cn('min-w-0', description ? 'gap-1' : 'gap-2', className)}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {description ? (
        <FieldDescription className={WORKFLOW_FIELD_CAPTION_CLASS}>{description}</FieldDescription>
      ) : null}
      {children}
    </Field>
  )
}

export function ArtifactToolbarActions({
  text,
  copied,
  setCopied,
  copyLabel,
  isStreaming,
  onCopy,
  onExport,
  exportDisabled = false,
  onRegenerate,
  ticketUrlPattern,
  ticketId,
  trailingActions,
  dockEmbedded = false
}: {
  text: string
  copied: boolean
  setCopied: (v: boolean) => void
  copyLabel: string
  isStreaming: boolean
  onCopy: (text: string, setCopied: (v: boolean) => void) => void | Promise<void>
  onExport?: (text: string) => void | Promise<void>
  exportDisabled?: boolean
  onRegenerate?: () => void
  ticketUrlPattern?: string
  ticketId?: string
  trailingActions?: ReactNode
  dockEmbedded?: boolean
}) {
  const hasText = !!text.trim()
  const erpEnabled = !!ticketUrlPattern?.trim() && !!ticketId?.trim()
  const copyLabelResolved = erpEnabled
    ? copied
      ? 'Copié'
      : "Copier + Ouvrir dans l'ERP"
    : copied
      ? 'Copié'
      : copyLabel

  const handleCopyClick = () => {
    void (async () => {
      await onCopy(text, setCopied)
      if (!erpEnabled) return
      const url = resolveTicketUrl(ticketId!.trim(), ticketUrlPattern!.trim())
      void window.api?.openInAppBrowser({ url, answer: text })
    })()
  }

  const copyExportGroup = (
    <ButtonGroup aria-label="Copie, export et évaluation">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size={erpEnabled && !copied ? 'default' : 'icon'}
              disabled={!hasText}
              aria-label={copyLabelResolved}
              aria-pressed={copied || undefined}
              className={cn('text-foreground', copied && 'bg-foreground/10 text-foreground')}
              onClick={handleCopyClick}
            />
          }
        >
          {copied ? (
            <Check />
          ) : erpEnabled ? (
            <>
              <Copy />
              <Plus className="text-muted-foreground/80 size-3 shrink-0 stroke-[2.5]" aria-hidden />
              <ExternalLink />
            </>
          ) : (
            <Copy />
          )}
        </TooltipTrigger>
        <TooltipContent>{copyLabelResolved}</TooltipContent>
      </Tooltip>
      {onExport ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!hasText || exportDisabled}
                aria-label="Exporter en Word"
                className="text-foreground"
                onClick={() => void onExport(text)}
              />
            }
          >
            <FileDown />
          </TooltipTrigger>
          <TooltipContent>Exporter en Word</TooltipContent>
        </Tooltip>
      ) : null}
      {trailingActions}
    </ButtonGroup>
  )

  return (
    <>
      {onRegenerate ? (
        <ButtonGroup aria-label="Gestion du brouillon">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isStreaming}
                  aria-label="Regénérer"
                  className="text-foreground"
                  onClick={onRegenerate}
                />
              }
            >
              <RotateCcw />
            </TooltipTrigger>
            <TooltipContent>Regénérer</TooltipContent>
          </Tooltip>
        </ButtonGroup>
      ) : null}
      {dockEmbedded ? copyExportGroup : <div className="ml-auto shrink-0">{copyExportGroup}</div>}
    </>
  )
}

export function ActLink({
  label,
  icon,
  onClick,
  className,
  iconOnly = false,
  disabled = false,
  copied = false
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  className?: string
  iconOnly?: boolean
  disabled?: boolean
  copied?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'items-center justify-center rounded-md border border-border bg-background/60 text-sm font-medium text-muted-foreground transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-background',
        copied && !disabled && 'bg-white text-foreground',
        iconOnly ? 'inline-flex h-8 w-8 shrink-0 p-0' : 'flex h-10 flex-1 gap-1.5 px-3',
        className
      )}
    >
      {icon}
      {!iconOnly && label}
    </button>
  )
}
