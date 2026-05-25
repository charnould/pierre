export const UPDATES_SPLIT_MIN = 24
export const UPDATES_SPLIT_MAX = 45
export const UPDATES_SPLIT_DEFAULT_LIST = 28

export const UPDATES_PANEL_LIST = 'list'
export const UPDATES_PANEL_DETAIL = 'detail'

export type UpdatesPanelSplit = {
  listPercent?: number
}

export const parseUpdatesListPercent = (value: unknown): number | undefined => {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return undefined
  const rounded = Math.round(n)
  if (rounded < UPDATES_SPLIT_MIN || rounded > UPDATES_SPLIT_MAX) return undefined
  return rounded
}

export const parseUpdatesPanelSplit = (value: unknown): UpdatesPanelSplit | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const raw = value as Record<string, unknown>
  const listPercent = parseUpdatesListPercent(raw.listPercent)
  if (listPercent === undefined) return undefined
  return { listPercent }
}

export const defaultUpdatesPanelLayout = (split?: UpdatesPanelSplit): Record<string, number> => {
  const listPercent = split?.listPercent ?? UPDATES_SPLIT_DEFAULT_LIST
  return {
    [UPDATES_PANEL_LIST]: listPercent,
    [UPDATES_PANEL_DETAIL]: 100 - listPercent
  }
}

export const listPercentFromUpdatesLayout = (layout: Record<string, number>): number => {
  const list = layout[UPDATES_PANEL_LIST]
  if (typeof list === 'number' && list >= UPDATES_SPLIT_MIN && list <= UPDATES_SPLIT_MAX) {
    return Math.round(list)
  }
  return UPDATES_SPLIT_DEFAULT_LIST
}

export const splitFromUpdatesLayout = (layout: Record<string, number>): UpdatesPanelSplit => ({
  listPercent: listPercentFromUpdatesLayout(layout)
})
