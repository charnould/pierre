import {
  AUTOMATIONS_SPLIT_DEFAULT_LIST,
  parseAutomationsPanelSplit,
  type AutomationsPanelSplit
} from './automations-panel'
import {
  parseColumnFilters,
  parseColumnOrder,
  parseColumnValueBadgeDefaults,
  parseColumnValues,
  parseColumnWidths,
  parseHiddenColumns,
  parsePinnedColumns,
  resolveColumnValueBadgeDefaults,
  type ColumnValueBadgeDefaults,
  type ColumnValuesConfig
} from './tickets-table'
import {
  parseUpdatesPanelSplit,
  UPDATES_SPLIT_DEFAULT_LIST,
  type UpdatesPanelSplit
} from './updates-panel'
import {
  parseWorkflowTicketsOutputSplit,
  WORKFLOW_SPLIT_DEFAULT_CONTEXTE,
  type WorkflowTicketsOutputSplit
} from './workflow-output'

export type { AutomationsPanelSplit } from './automations-panel'
export {
  AUTOMATIONS_PANEL_DETAIL,
  AUTOMATIONS_PANEL_LIST,
  AUTOMATIONS_SPLIT_DEFAULT_LIST,
  defaultAutomationsPanelLayout,
  listPercentFromLayout,
  parseAutomationsPanelSplit,
  splitFromAutomationsLayout
} from './automations-panel'
export type { UpdatesPanelSplit } from './updates-panel'
export {
  UPDATES_PANEL_DETAIL,
  UPDATES_PANEL_LIST,
  UPDATES_SPLIT_DEFAULT_LIST,
  defaultUpdatesPanelLayout,
  listPercentFromUpdatesLayout,
  parseUpdatesPanelSplit,
  splitFromUpdatesLayout
} from './updates-panel'
export type {
  WorkflowTicketsOutputSplit,
  WorkflowOutputSplit,
  WorkflowOutputSplitKey
} from './workflow-output'
export {
  WORKFLOW_PANEL_ANALYSE,
  WORKFLOW_PANEL_CONTEXTE,
  WORKFLOW_PANEL_OUTPUT,
  WORKFLOW_PANEL_REPONSE,
  WORKFLOW_SPLIT_DEFAULT_CONTEXTE,
  contextePercentFromLayout,
  defaultWorkflowPanelLayout,
  parseWorkflowOutputSplit,
  parseWorkflowTicketsOutputSplit,
  resolveWorkflowOutputSplit,
  splitFromLayout
} from './workflow-output'

export type {
  ColumnValueBadgeDefaults,
  ColumnValueStyle,
  ColumnValuesConfig
} from './tickets-table'
export { resolveTicketValueDisplay } from './tickets-table'

export type TicketsTableSettings = {
  columnLabels?: Record<string, string>
  columnValueBadge?: ColumnValueBadgeDefaults
  columnValues?: ColumnValuesConfig
  columnOrder?: string[]
  hiddenColumns?: string[]
  pinnedColumns?: string[]
  columnWidths?: Record<string, number>
  columnFilters?: Record<string, string[]>
}

export type WorkflowSettings = {
  ticketsOutputSplit?: WorkflowTicketsOutputSplit
  aboutOutputSplit?: WorkflowTicketsOutputSplit
}

export type AutomationsSettings = {
  panelSplit?: AutomationsPanelSplit
}

export type UpdatesSettings = {
  panelSplit?: UpdatesPanelSplit
}

export type WindowSettings = {
  width?: number
  height?: number
  x?: number
  y?: number
}

export const DEFAULT_WINDOW_BOUNDS = { width: 1190, height: 840 } as const
export const WINDOW_MIN_SIZE = { width: 360, height: 400 } as const

export type UiSettings = {
  window?: WindowSettings
  tickets?: {
    table?: TicketsTableSettings
  }
  workflow?: WorkflowSettings
  automations?: AutomationsSettings
  updates?: UpdatesSettings
}

export const TICKET_COLUMN_VALUES_DEFAULTS: ColumnValuesConfig = {
  avancement: {
    'en cours': { bgColor: '#B5C2F4', textColor: '#2A40A0' },
    terminé: { bgColor: '#A1D1C0', textColor: '#0A6850' },
    'à faire': { bgColor: '#EED1A2', textColor: '#906008' },
    'en attente': { bgColor: '#EAB0B4', textColor: '#B02838' },
    planifié: { bgColor: '#BCB3E1', textColor: '#402898' }
  },
  statut: {
    ouvert: { bgColor: '#B5C2F4', textColor: '#2A40A0' },
    clos: { bgColor: '#A1D1C0', textColor: '#0A6850' },
    annulé: { bgColor: '#DAAFC0', textColor: '#882858' },
    nouveau: { bgColor: '#9ED4CC', textColor: '#087068' }
  },
  degre_urgence: {
    urgent: { bgColor: '#EAB0B4', textColor: '#B02838' },
    élevé: { bgColor: '#EED1A2', textColor: '#906008' },
    moyen: { bgColor: '#EED1A2', textColor: '#906008' },
    faible: { bgColor: '#A1D1C0', textColor: '#0A6850' },
    normal: { bgColor: '#AEBCC0', textColor: '#34404C' }
  },
  type_affaire: {
    réclamation: { bgColor: '#EAB0B4', textColor: '#B02838' },
    demande: { bgColor: '#B5C2F4', textColor: '#2A40A0' },
    incident: { bgColor: '#EED1A2', textColor: '#906008' }
  }
}

export const UI_SETTINGS_DEFAULTS: UiSettings = {
  window: { ...DEFAULT_WINDOW_BOUNDS },
  workflow: {
    ticketsOutputSplit: { contextePercent: WORKFLOW_SPLIT_DEFAULT_CONTEXTE },
    aboutOutputSplit: { contextePercent: WORKFLOW_SPLIT_DEFAULT_CONTEXTE }
  },
  automations: {
    panelSplit: { listPercent: AUTOMATIONS_SPLIT_DEFAULT_LIST }
  },
  updates: {
    panelSplit: { listPercent: UPDATES_SPLIT_DEFAULT_LIST }
  },
  tickets: {
    table: {
      columnLabels: {},
      columnValueBadge: resolveColumnValueBadgeDefaults(),
      columnValues: TICKET_COLUMN_VALUES_DEFAULTS,
      columnOrder: undefined,
      hiddenColumns: undefined,
      columnFilters: undefined
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Deep-merges raw UI settings documents before parse (preserves table keys omitted in partial saves). */
export function mergeUiSettingsRawDocuments(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  if (Object.keys(incoming).length === 0) {
    return {}
  }

  const existingTickets = isRecord(existing.tickets) ? existing.tickets : {}
  const incomingTickets = isRecord(incoming.tickets) ? incoming.tickets : {}
  const existingTable = isRecord(existingTickets.table) ? existingTickets.table : {}
  const incomingTable = isRecord(incomingTickets.table) ? incomingTickets.table : {}
  const existingWorkflow = isRecord(existing.workflow) ? existing.workflow : {}
  const incomingWorkflow = isRecord(incoming.workflow) ? incoming.workflow : {}
  const existingAutomations = isRecord(existing.automations) ? existing.automations : {}
  const incomingAutomations = isRecord(incoming.automations) ? incoming.automations : {}
  const existingUpdates = isRecord(existing.updates) ? existing.updates : {}
  const incomingUpdates = isRecord(incoming.updates) ? incoming.updates : {}
  const existingWindow = isRecord(existing.window) ? existing.window : {}
  const incomingWindow = isRecord(incoming.window) ? incoming.window : {}

  return {
    ...existing,
    ...incoming,
    window: {
      ...existingWindow,
      ...incomingWindow
    },
    tickets: {
      ...existingTickets,
      ...incomingTickets,
      table: {
        ...existingTable,
        ...incomingTable
      }
    },
    workflow: {
      ...existingWorkflow,
      ...incomingWorkflow
    },
    automations: {
      ...existingAutomations,
      ...incomingAutomations
    },
    updates: {
      ...existingUpdates,
      ...incomingUpdates
    }
  }
}

const parseColumnLabels = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) return undefined
  const labels: Record<string, string> = {}
  for (const [key, label] of Object.entries(value)) {
    if (typeof label === 'string') labels[key] = label
  }
  return Object.keys(labels).length > 0 ? labels : undefined
}

const normalizeTableSection = (table: Record<string, unknown>): Record<string, unknown> => {
  const normalizedTable: Record<string, unknown> = { ...table }

  if ('columnLabels' in table) {
    const labels = parseColumnLabels(table.columnLabels)
    if (labels) normalizedTable.columnLabels = labels
    else delete normalizedTable.columnLabels
  }

  if ('columnOrder' in table) {
    const order = parseColumnOrder(table.columnOrder)
    if (order) normalizedTable.columnOrder = order
    else delete normalizedTable.columnOrder
  }

  if ('hiddenColumns' in table) {
    const hidden = parseHiddenColumns(table.hiddenColumns)
    if (hidden) normalizedTable.hiddenColumns = hidden
    else delete normalizedTable.hiddenColumns
  }

  if ('pinnedColumns' in table) {
    const pinned = parsePinnedColumns(table.pinnedColumns)
    if (pinned) normalizedTable.pinnedColumns = pinned
    else delete normalizedTable.pinnedColumns
  }

  if ('columnWidths' in table) {
    const widths = parseColumnWidths(table.columnWidths)
    if (widths) normalizedTable.columnWidths = widths
    else delete normalizedTable.columnWidths
  }

  if ('columnFilters' in table) {
    const filters = parseColumnFilters(table.columnFilters)
    if (filters) normalizedTable.columnFilters = filters
    else delete normalizedTable.columnFilters
  }

  if ('columnValueBadge' in table) {
    const badgeDefaults = parseColumnValueBadgeDefaults(table.columnValueBadge)
    if (badgeDefaults) normalizedTable.columnValueBadge = badgeDefaults
    else delete normalizedTable.columnValueBadge
  }

  if ('columnValues' in table) {
    const values = parseColumnValues(table.columnValues)
    if (values) normalizedTable.columnValues = values
    else delete normalizedTable.columnValues
  }

  delete normalizedTable.pageSize

  return normalizedTable
}

const normalizeWorkflowSection = (workflow: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = { ...workflow }
  if ('ticketsOutputSplit' in workflow) {
    const split = parseWorkflowTicketsOutputSplit(workflow.ticketsOutputSplit)
    if (split) normalized.ticketsOutputSplit = split
    else delete normalized.ticketsOutputSplit
  }
  if ('aboutOutputSplit' in workflow) {
    const split = parseWorkflowTicketsOutputSplit(workflow.aboutOutputSplit)
    if (split) normalized.aboutOutputSplit = split
    else delete normalized.aboutOutputSplit
  }
  return normalized
}

const normalizeAutomationsSection = (
  automations: Record<string, unknown>
): Record<string, unknown> => {
  const normalized: Record<string, unknown> = { ...automations }
  if ('panelSplit' in automations) {
    const split = parseAutomationsPanelSplit(automations.panelSplit)
    if (split) normalized.panelSplit = split
    else delete normalized.panelSplit
  }
  return normalized
}

const normalizeUpdatesSection = (updates: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = { ...updates }
  if ('panelSplit' in updates) {
    const split = parseUpdatesPanelSplit(updates.panelSplit)
    if (split) normalized.panelSplit = split
    else delete normalized.panelSplit
  }
  return normalized
}

const parseFiniteInt = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.round(value)
}

export function clampWindowSize(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(WINDOW_MIN_SIZE.width, width),
    height: Math.max(WINDOW_MIN_SIZE.height, height)
  }
}

export function parseWindowSettings(value: unknown): WindowSettings | undefined {
  if (!isRecord(value)) return undefined

  const result: WindowSettings = {}
  const width = parseFiniteInt(value.width)
  const height = parseFiniteInt(value.height)
  const x = parseFiniteInt(value.x)
  const y = parseFiniteInt(value.y)

  if (width !== undefined && width > 0) result.width = width
  if (height !== undefined && height > 0) result.height = height
  if (x !== undefined) result.x = x
  if (y !== undefined) result.y = y

  if (result.width !== undefined && result.height !== undefined) {
    const clamped = clampWindowSize(result.width, result.height)
    result.width = clamped.width
    result.height = clamped.height
  }

  return Object.keys(result).length > 0 ? result : undefined
}

const normalizeWindowSection = (window: Record<string, unknown>): Record<string, unknown> => {
  const parsed = parseWindowSettings(window)
  return parsed ? { ...parsed } : {}
}

/** Validates known sections; preserves unknown top-level keys. */
export function parseUiSettings(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) return {}

  const result: Record<string, unknown> = { ...raw }

  if ('window' in raw && isRecord(raw.window)) {
    result.window = normalizeWindowSection(raw.window)
  }

  if ('workflow' in raw && isRecord(raw.workflow)) {
    result.workflow = normalizeWorkflowSection(raw.workflow)
  }

  if ('automations' in raw && isRecord(raw.automations)) {
    result.automations = normalizeAutomationsSection(raw.automations)
  }

  if ('updates' in raw && isRecord(raw.updates)) {
    result.updates = normalizeUpdatesSection(raw.updates)
  }

  if ('tickets' in raw && isRecord(raw.tickets)) {
    const tickets = raw.tickets
    const normalized: Record<string, unknown> = { ...tickets }

    if ('table' in tickets && isRecord(tickets.table)) {
      normalized.table = normalizeTableSection(tickets.table)
    }

    result.tickets = normalized
  }

  return result
}

/** Merges parsed settings with raw `columnValues` when normalization dropped them. */
export function resolveUiSettingsFromRaw(raw: Record<string, unknown>): UiSettings {
  const rawColumnValues =
    isRecord(raw.tickets) && isRecord(raw.tickets.table)
      ? raw.tickets.table.columnValues
      : undefined
  const merged = mergeUiSettings(parseUiSettings(raw))
  const columnValues = merged.tickets?.table?.columnValues ?? parseColumnValues(rawColumnValues)
  if (!columnValues) return merged

  return {
    ...merged,
    tickets: {
      ...merged.tickets,
      table: {
        ...merged.tickets?.table,
        columnValues
      }
    }
  }
}

export function mergeUiSettings(user: Record<string, unknown>): UiSettings {
  const userTickets = isRecord(user.tickets) ? user.tickets : {}
  const userTable = isRecord(userTickets.table) ? userTickets.table : {}
  const userLabels = isRecord(userTable.columnLabels) ? userTable.columnLabels : {}

  const mergedLabels: Record<string, string> = {
    ...UI_SETTINGS_DEFAULTS.tickets!.table!.columnLabels
  }
  for (const [key, label] of Object.entries(userLabels)) {
    if (typeof label === 'string') mergedLabels[key] = label
  }

  const userWorkflow = isRecord(user.workflow) ? user.workflow : {}
  const userAutomations = isRecord(user.automations) ? user.automations : {}
  const userUpdates = isRecord(user.updates) ? user.updates : {}
  const userWindow = isRecord(user.window) ? user.window : {}
  const parsedWindow = parseWindowSettings(userWindow)

  return {
    ...user,
    window:
      parsedWindow?.width !== undefined && parsedWindow.height !== undefined
        ? parsedWindow
        : { ...DEFAULT_WINDOW_BOUNDS },
    tickets: {
      ...userTickets,
      table: {
        ...userTable,
        columnLabels: mergedLabels,
        columnValueBadge: resolveColumnValueBadgeDefaults(
          parseColumnValueBadgeDefaults(userTable.columnValueBadge)
        ),
        columnOrder: parseColumnOrder(userTable.columnOrder),
        hiddenColumns: parseHiddenColumns(userTable.hiddenColumns),
        pinnedColumns: parsePinnedColumns(userTable.pinnedColumns),
        columnWidths: parseColumnWidths(userTable.columnWidths),
        columnFilters: parseColumnFilters(userTable.columnFilters),
        columnValues: parseColumnValues(userTable.columnValues)
      }
    },
    workflow: {
      ...userWorkflow,
      ticketsOutputSplit:
        parseWorkflowTicketsOutputSplit(userWorkflow.ticketsOutputSplit) ??
        UI_SETTINGS_DEFAULTS.workflow!.ticketsOutputSplit,
      aboutOutputSplit:
        parseWorkflowTicketsOutputSplit(userWorkflow.aboutOutputSplit) ??
        UI_SETTINGS_DEFAULTS.workflow!.aboutOutputSplit
    },
    automations: {
      ...userAutomations,
      panelSplit:
        parseAutomationsPanelSplit(userAutomations.panelSplit) ??
        UI_SETTINGS_DEFAULTS.automations!.panelSplit
    },
    updates: {
      ...userUpdates,
      panelSplit:
        parseUpdatesPanelSplit(userUpdates.panelSplit) ?? UI_SETTINGS_DEFAULTS.updates!.panelSplit
    }
  }
}

export function resolveTicketColumnLabel(name: string, settings?: UiSettings): string {
  const label = settings?.tickets?.table?.columnLabels?.[name]
  if (typeof label === 'string' && label.trim()) return label.trim()
  return name
}

/** Raw `ui-settings.json` document on a fresh install (before runtime seeding). */
export function buildFactoryUiSettingsDocument(): Record<string, unknown> {
  return {}
}

export function formatUiSettingsFileContent(doc: Record<string, unknown>): string {
  return `${JSON.stringify(doc, null, 2)}\n`
}

/** Raw `ui-settings.json` content on a fresh install (before runtime seeding). */
export const FACTORY_UI_SETTINGS_FILE_CONTENT = formatUiSettingsFileContent(
  buildFactoryUiSettingsDocument()
)

export function isFactoryUiSettingsFileContent(text: string): boolean {
  const trimmed = text.trim()
  if (trimmed === '' || trimmed === '{}') return true

  try {
    const parsed = JSON.parse(text) as unknown
    return isRecord(parsed) && Object.keys(parsed).length === 0
  } catch {
    return false
  }
}

export const UI_SETTINGS_EXAMPLE = `{
  "window": {
    "width": 1190,
    "height": 840
  },
  "workflow": {
    "ticketsOutputSplit": {
      "contextePercent": 28
    },
    "aboutOutputSplit": {
      "contextePercent": 28
    }
  },
  "automations": {
    "panelSplit": {
      "listPercent": 28
    }
  },
  "updates": {
    "panelSplit": {
      "listPercent": 28
    }
  },
  "tickets": {
    "table": {
      "columnLabels": {
        "id_reclamation": "N° d'affaire",
        "id_locataire": "Locataire",
        "motif": "Motif"
      },
      "columnOrder": ["id_reclamation", "motif", "id_locataire", "id_lot"],
      "hiddenColumns": [],
      "pinnedColumns": ["id_reclamation", "id_locataire", "id_lot"],
      "columnWidths": {
        "description": 320,
        "motif": 240
      },
      "columnFilters": {
        "motif": ["fuite"]
      },
      "columnValueBadge": {
        "borderRadius": "9999px",
        "fontWeight": 500
      },
      "columnValues": {
        "avancement": {
          "aucun traitement": { "bgColor": "#EED1A2", "textColor": "#906008" },
          "en cours": { "bgColor": "#B5C2F4", "textColor": "#2A40A0" },
          "terminé": { "bgColor": "#A1D1C0", "textColor": "#0A6850" }
        },
        "statut": {
          "ouvert": { "bgColor": "#B5C2F4", "textColor": "#2A40A0" },
          "clos": { "bgColor": "#A1D1C0", "textColor": "#0A6850" },
          "annulé": { "bgColor": "#DAAFC0", "textColor": "#882858" },
          "nouveau": { "bgColor": "#9ED4CC", "textColor": "#087068" }
        },
        "degre_urgence": {
          "urgent": { "bgColor": "#EAB0B4", "textColor": "#B02838" },
          "normal": { "bgColor": "#AEBCC0", "textColor": "#34404C" }
        },
        "type_affaire": {
          "réclamation": { "bgColor": "#EAB0B4", "textColor": "#B02838" },
          "demande": { "bgColor": "#B5C2F4", "textColor": "#2A40A0" },
          "incident": { "bgColor": "#EED1A2", "textColor": "#906008" }
        }
      }
    }
  }
}`
