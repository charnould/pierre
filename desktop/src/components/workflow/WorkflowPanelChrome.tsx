import { Copy, FileDown, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'

import { Field, FieldLabel } from '@/components/ui/field'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatThinkingMessage } from '@/lib/thinking-message'
import { cn } from '@/lib/utils'

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
  'flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-2'

export const WORKFLOW_FORM_INNER_CLASS = 'flex flex-col gap-3 p-3.5 pb-3'

export const WORKFLOW_FORM_ANSWER_CLASS =
  'shadow-[0_1px_2px_rgb(0_0_0/0.05),0_4px_12px_rgb(0_0_0/0.04)]'

export const WORKFLOW_FORM_ANSWER_INNER_CLASS = 'flex flex-col gap-3.5 px-[18px] pt-4 pb-3.5'

export const WORKFLOW_INPUT_CLASS = 'w-full min-w-0'

export const WORKFLOW_TEXTAREA_CLASS = 'min-h-[88px] w-full min-w-0'

export const WORKFLOW_ANSWER_TEXTAREA_CLASS = 'min-h-[132px]'

export const WORKFLOW_FORM_LEGEND_CLASS = 'm-0 text-xs leading-snug text-muted-foreground'

export const WORKFLOW_TOOLBAR_GROUP_CLASS = 'flex flex-row flex-wrap items-end gap-x-4 gap-y-3'

export const WORKFLOW_TOOLBAR_ACTIONS_CLASS =
  'flex shrink-0 items-center gap-2 self-end border-l border-border pl-4'

export const WORKFLOW_SELECT_TRIGGER_CLASS =
  'w-full min-w-0 [&_[data-slot=select-value]]:line-clamp-none'

export const WORKFLOW_ARTIFACT_TITLE_CLASS =
  'm-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground'

export function workflowThinkingMessage(duration?: number) {
  return formatThinkingMessage(WORKFLOW_TOOLBAR_LABEL, duration)
}

export function WorkflowFormField({
  label,
  htmlFor,
  children,
  className
}: {
  label: string
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Field className={cn('min-w-0 gap-2', className)}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
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
  onRegenerate
}: {
  text: string
  copied: boolean
  setCopied: (v: boolean) => void
  copyLabel: string
  isStreaming: boolean
  onCopy: (text: string, setCopied: (v: boolean) => void) => void | Promise<void>
  onExport: (text: string) => void | Promise<void>
  onRegenerate?: () => void
}) {
  const hasText = !!text.trim()
  return (
    <>
      <ActLink
        iconOnly
        disabled={!hasText}
        label={copied ? 'Copié' : copyLabel}
        icon={<Copy className="h-3.5 w-3.5" />}
        onClick={() => void onCopy(text, setCopied)}
      />
      <ActLink
        iconOnly
        disabled={!hasText}
        label="Exporter en Word"
        icon={<FileDown className="h-3.5 w-3.5" />}
        onClick={() => void onExport(text)}
      />
      {onRegenerate ? (
        <ActLink
          iconOnly
          disabled={isStreaming}
          label="Regénérer"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={onRegenerate}
        />
      ) : null}
    </>
  )
}

export function ActLink({
  label,
  icon,
  onClick,
  className,
  iconOnly = false,
  disabled = false
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  className?: string
  iconOnly?: boolean
  disabled?: boolean
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'items-center justify-center rounded-md border border-border bg-background/60 text-sm font-medium text-muted-foreground transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-background',
        iconOnly ? 'inline-flex h-8 w-8 shrink-0 p-0' : 'flex h-10 flex-1 gap-1.5 px-3',
        className
      )}
    >
      {icon}
      {!iconOnly && label}
    </button>
  )

  return (
    <Tooltip>
      <TooltipTrigger render={disabled ? <span className="inline-flex" /> : undefined}>
        {button}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  )
}
