const WORKFLOW_SPLIT_MIN = 20
const WORKFLOW_SPLIT_MAX = 80
export const WORKFLOW_SPLIT_DEFAULT_CONTEXTE = 28

export const WORKFLOW_PANEL_CONTEXTE = 'contexte'
export const WORKFLOW_PANEL_OUTPUT = 'output'

export type WorkflowTicketsOutputSplit = {
  contextePercent?: number
}

/** Shared dual-panel split shape (tickets, about, …). */
export type WorkflowOutputSplit = WorkflowTicketsOutputSplit

export type WorkflowOutputSplitKey = 'ticketsOutputSplit' | 'aboutOutputSplit'

const parseContextePercent = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return undefined
  const rounded = Math.round(n)
  if (rounded < WORKFLOW_SPLIT_MIN || rounded > WORKFLOW_SPLIT_MAX) return undefined
  return rounded
}

export const parseWorkflowTicketsOutputSplit = (
  value: unknown
): WorkflowTicketsOutputSplit | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const contextePercent = parseContextePercent(raw.contextePercent)
  if (contextePercent === undefined) return undefined
  return { contextePercent }
}

export type WorkflowSettingsLike = {
  ticketsOutputSplit?: WorkflowOutputSplit
  aboutOutputSplit?: WorkflowOutputSplit
}

export const resolveWorkflowOutputSplit = (
  workflow: WorkflowSettingsLike | undefined,
  key: WorkflowOutputSplitKey
): WorkflowOutputSplit => {
  const split = parseWorkflowTicketsOutputSplit(workflow?.[key])
  return split ?? { contextePercent: WORKFLOW_SPLIT_DEFAULT_CONTEXTE }
}

const resolveContextePercent = (split?: WorkflowTicketsOutputSplit): number => {
  return split?.contextePercent ?? WORKFLOW_SPLIT_DEFAULT_CONTEXTE
}

export const defaultWorkflowPanelLayout = (
  split?: WorkflowTicketsOutputSplit
): Record<string, number> => {
  const contextePercent = resolveContextePercent(split)
  return {
    [WORKFLOW_PANEL_CONTEXTE]: contextePercent,
    [WORKFLOW_PANEL_OUTPUT]: 100 - contextePercent
  }
}

export const contextePercentFromLayout = (layout: Record<string, number>): number => {
  const contexte = layout[WORKFLOW_PANEL_CONTEXTE]
  if (
    typeof contexte === 'number' &&
    contexte >= WORKFLOW_SPLIT_MIN &&
    contexte <= WORKFLOW_SPLIT_MAX
  ) {
    return Math.round(contexte)
  }
  return WORKFLOW_SPLIT_DEFAULT_CONTEXTE
}

export const splitFromLayout = (layout: Record<string, number>): WorkflowTicketsOutputSplit => ({
  contextePercent: contextePercentFromLayout(layout)
})
