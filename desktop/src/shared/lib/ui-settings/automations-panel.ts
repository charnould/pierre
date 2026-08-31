const AUTOMATIONS_SPLIT_MIN = 20
const AUTOMATIONS_SPLIT_MAX = 45
export const AUTOMATIONS_SPLIT_DEFAULT_LIST = 28

const AUTOMATIONS_PANEL_LIST = 'automations-list'
const AUTOMATIONS_PANEL_DETAIL = 'automations-detail'

export type AutomationsPanelSplit = {
  listPercent?: number
}

export const parseListPercent = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return undefined
  const rounded = Math.round(n)
  if (rounded < AUTOMATIONS_SPLIT_MIN || rounded > AUTOMATIONS_SPLIT_MAX) return undefined
  return rounded
}

export const parseAutomationsPanelSplit = (value: unknown): AutomationsPanelSplit | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const listPercent = parseListPercent(raw.listPercent)
  if (listPercent === undefined) return undefined
  return { listPercent }
}

export const defaultAutomationsPanelLayout = (
  split?: AutomationsPanelSplit
): Record<string, number> => {
  const listPercent = split?.listPercent ?? AUTOMATIONS_SPLIT_DEFAULT_LIST
  return {
    [AUTOMATIONS_PANEL_LIST]: listPercent,
    [AUTOMATIONS_PANEL_DETAIL]: 100 - listPercent
  }
}

export const listPercentFromLayout = (layout: Record<string, number>): number => {
  const list = layout[AUTOMATIONS_PANEL_LIST]
  if (typeof list === 'number' && list >= AUTOMATIONS_SPLIT_MIN && list <= AUTOMATIONS_SPLIT_MAX) {
    return Math.round(list)
  }
  return AUTOMATIONS_SPLIT_DEFAULT_LIST
}

export const splitFromAutomationsLayout = (
  layout: Record<string, number>
): AutomationsPanelSplit => ({
  listPercent: listPercentFromLayout(layout)
})
