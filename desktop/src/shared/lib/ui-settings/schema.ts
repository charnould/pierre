import {
  DEFAULT_MASCOT_BADGE_COLOR,
  DEFAULT_MASCOT_COLOR,
  DEFAULT_MASCOT_SHAPE,
  parseMascotColor,
  parseMascotShape,
  type MascotColor,
  type MascotShape
} from '../../../mascot/look'
import { MASCOT_VIEWBOX_SIZE } from '../../../mascot/profiles'
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

export { AUTOMATIONS_SPLIT_DEFAULT_LIST, parseAutomationsPanelSplit } from './automations-panel'

export { UPDATES_SPLIT_DEFAULT_LIST, parseUpdatesPanelSplit } from './updates-panel'
export type { WorkflowOutputSplitKey } from './workflow-output'
export {
  WORKFLOW_PANEL_CONTEXTE,
  WORKFLOW_PANEL_OUTPUT,
  WORKFLOW_SPLIT_DEFAULT_CONTEXTE,
  defaultWorkflowPanelLayout,
  parseWorkflowTicketsOutputSplit,
  resolveWorkflowOutputSplit,
  splitFromLayout
} from './workflow-output'

export type { ColumnValuesConfig } from './tickets-table'

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

export type MascotSettings = {
  enabled?: boolean
  /** Diamètre du corps, en pixels. */
  size?: number
  x?: number
  y?: number
  shape?: MascotShape
  color?: MascotColor
  badgeColor?: MascotColor
}

export const DEFAULT_WINDOW_BOUNDS = { width: 1190, height: 840 } as const
/**
 * Compact centered shell fitted to the login stack (titlebar + px-6 py-6 +
 * 64px mark + legal checkboxes at 12/16). FieldError sits under the field or
 * the legal block — not reserved. Do not stretch the form with flex-1.
 */
export const LOGIN_WINDOW_BOUNDS = { width: 400, height: 560 } as const
export const WINDOW_MIN_SIZE = { width: 360, height: 400 } as const
export const MASCOT_SIZE_RANGE = { min: 80, max: 240, step: 10 } as const
/** Diamètre du corps dans le viewBox (unités). */
const MASCOT_BODY_DIAMETER = 100
export const DEFAULT_MASCOT_SETTINGS: MascotSettings = {
  enabled: true,
  size: 120,
  shape: DEFAULT_MASCOT_SHAPE,
  color: DEFAULT_MASCOT_COLOR,
  badgeColor: DEFAULT_MASCOT_BADGE_COLOR
}

export type UiSettings = {
  window?: WindowSettings
  mascot?: MascotSettings
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
  mascot: { ...DEFAULT_MASCOT_SETTINGS },
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

export function isUiSettingsFileObject(value: unknown): value is Record<string, unknown> {
  return isRecord(value)
}

function collectDroppedKeys(raw: unknown, parsed: unknown, prefix = ''): string[] {
  if (!isRecord(raw)) return []
  const parsedRecord = isRecord(parsed) ? parsed : {}
  const dropped: string[] = []
  for (const key of Object.keys(raw)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (!(key in parsedRecord)) {
      dropped.push(path)
      continue
    }
    if (isRecord(raw[key])) {
      dropped.push(...collectDroppedKeys(raw[key], parsedRecord[key], path))
    }
  }
  return dropped
}

/** Dotted paths dropped by `parseUiSettings` (unknown keys and values that fail validation). */
export function listDroppedUiSettingsKeys(raw: unknown): string[] {
  return collectDroppedKeys(raw, parseUiSettings(raw))
}

const parseColumnLabels = (value: unknown): Record<string, string> | undefined => {
  if (!isRecord(value)) return undefined
  const labels: Record<string, string> = {}
  for (const [key, label] of Object.entries(value)) {
    if (typeof label === 'string') labels[key] = label
  }
  return Object.keys(labels).length > 0 ? labels : undefined
}

const assignIfNonEmpty = (
  target: Record<string, unknown>,
  key: string,
  value: Record<string, unknown>
): void => {
  if (Object.keys(value).length > 0) target[key] = value
}

const normalizeTableSection = (table: Record<string, unknown>): Record<string, unknown> => {
  const normalizedTable: Record<string, unknown> = {}

  if ('columnLabels' in table) {
    const labels = parseColumnLabels(table.columnLabels)
    if (labels) normalizedTable.columnLabels = labels
  }

  if ('columnOrder' in table) {
    const order = parseColumnOrder(table.columnOrder)
    if (order) normalizedTable.columnOrder = order
  }

  if ('hiddenColumns' in table) {
    const hidden = parseHiddenColumns(table.hiddenColumns)
    if (hidden) normalizedTable.hiddenColumns = hidden
  }

  if ('pinnedColumns' in table) {
    const pinned = parsePinnedColumns(table.pinnedColumns)
    if (pinned) normalizedTable.pinnedColumns = pinned
  }

  if ('columnWidths' in table) {
    const widths = parseColumnWidths(table.columnWidths)
    if (widths) normalizedTable.columnWidths = widths
  }

  if ('columnFilters' in table) {
    const filters = parseColumnFilters(table.columnFilters)
    if (filters) normalizedTable.columnFilters = filters
  }

  if ('columnValueBadge' in table) {
    const badgeDefaults = parseColumnValueBadgeDefaults(table.columnValueBadge)
    if (badgeDefaults) normalizedTable.columnValueBadge = badgeDefaults
  }

  if ('columnValues' in table) {
    const values = parseColumnValues(table.columnValues)
    // `parseColumnValues` collapses an empty map to `undefined`. Dropping the key
    // here would make "the user cleared every badge colour" read back as a fresh
    // install, and the defaults would return.
    if (values) normalizedTable.columnValues = values
    else if (isRecord(table.columnValues)) normalizedTable.columnValues = {}
  }

  return normalizedTable
}

const normalizeWorkflowSection = (workflow: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {}
  if ('ticketsOutputSplit' in workflow) {
    const split = parseWorkflowTicketsOutputSplit(workflow.ticketsOutputSplit)
    if (split) normalized.ticketsOutputSplit = split
  }
  if ('aboutOutputSplit' in workflow) {
    const split = parseWorkflowTicketsOutputSplit(workflow.aboutOutputSplit)
    if (split) normalized.aboutOutputSplit = split
  }
  return normalized
}

const normalizeAutomationsSection = (
  automations: Record<string, unknown>
): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {}
  if ('panelSplit' in automations) {
    const split = parseAutomationsPanelSplit(automations.panelSplit)
    if (split) normalized.panelSplit = split
  }
  return normalized
}

const normalizeUpdatesSection = (updates: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {}
  if ('panelSplit' in updates) {
    const split = parseUpdatesPanelSplit(updates.panelSplit)
    if (split) normalized.panelSplit = split
  }
  return normalized
}

const parseFiniteInt = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.round(value)
}

export function clampMascotSize(size: number): number {
  return Math.min(Math.max(Math.round(size), MASCOT_SIZE_RANGE.min), MASCOT_SIZE_RANGE.max)
}

export function mascotWindowExtent(size: number): number {
  return Math.round((clampMascotSize(size) * MASCOT_VIEWBOX_SIZE) / MASCOT_BODY_DIAMETER)
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

function parseMascotSettings(value: unknown): MascotSettings | undefined {
  if (!isRecord(value)) return undefined

  const result: MascotSettings = {}
  if (typeof value.enabled === 'boolean') result.enabled = value.enabled
  const x = parseFiniteInt(value.x)
  const y = parseFiniteInt(value.y)
  const size = parseFiniteInt(value.size)
  if (x !== undefined) result.x = x
  if (y !== undefined) result.y = y
  if (size !== undefined) result.size = clampMascotSize(size)
  const shape = parseMascotShape(value.shape)
  const color = parseMascotColor(value.color)
  const badgeColor = parseMascotColor(value.badgeColor)
  if (shape) result.shape = shape
  if (color) result.color = color
  if (badgeColor) result.badgeColor = badgeColor

  return Object.keys(result).length > 0 ? result : undefined
}

export function resolveMascotSettings(
  settings?: UiSettings | null
): Required<Pick<MascotSettings, 'enabled' | 'size' | 'shape' | 'color' | 'badgeColor'>> &
  Pick<MascotSettings, 'x' | 'y'> {
  return {
    enabled: settings?.mascot?.enabled ?? DEFAULT_MASCOT_SETTINGS.enabled!,
    size: settings?.mascot?.size ?? DEFAULT_MASCOT_SETTINGS.size!,
    shape: settings?.mascot?.shape ?? DEFAULT_MASCOT_SETTINGS.shape!,
    color: settings?.mascot?.color ?? DEFAULT_MASCOT_SETTINGS.color!,
    badgeColor: settings?.mascot?.badgeColor ?? DEFAULT_MASCOT_SETTINGS.badgeColor!,
    x: settings?.mascot?.x,
    y: settings?.mascot?.y
  }
}

const normalizeWindowSection = (window: Record<string, unknown>): Record<string, unknown> => {
  const parsed = parseWindowSettings(window)
  return parsed ? { ...parsed } : {}
}

const normalizeMascotSection = (mascot: Record<string, unknown>): Record<string, unknown> => {
  const parsed = parseMascotSettings(mascot)
  return parsed ? { ...parsed } : {}
}

/** Validates known sections; drops keys outside the `UiSettings` contract. */
export function parseUiSettings(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) return {}

  const result: Record<string, unknown> = {}

  if ('window' in raw && isRecord(raw.window)) {
    assignIfNonEmpty(result, 'window', normalizeWindowSection(raw.window))
  }

  if ('mascot' in raw && isRecord(raw.mascot)) {
    assignIfNonEmpty(result, 'mascot', normalizeMascotSection(raw.mascot))
  }

  if ('tickets' in raw && isRecord(raw.tickets)) {
    const tickets: Record<string, unknown> = {}
    if ('table' in raw.tickets && isRecord(raw.tickets.table)) {
      assignIfNonEmpty(tickets, 'table', normalizeTableSection(raw.tickets.table))
    }
    assignIfNonEmpty(result, 'tickets', tickets)
  }

  if ('workflow' in raw && isRecord(raw.workflow)) {
    assignIfNonEmpty(result, 'workflow', normalizeWorkflowSection(raw.workflow))
  }

  if ('automations' in raw && isRecord(raw.automations)) {
    assignIfNonEmpty(result, 'automations', normalizeAutomationsSection(raw.automations))
  }

  if ('updates' in raw && isRecord(raw.updates)) {
    assignIfNonEmpty(result, 'updates', normalizeUpdatesSection(raw.updates))
  }

  return result
}

/** Runtime settings: known keys from `raw`, with factory defaults filled in. */
export function resolveUiSettingsFromRaw(raw: unknown): UiSettings {
  return mergeUiSettings(isRecord(raw) ? raw : {})
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
  const userMascot = isRecord(user.mascot) ? user.mascot : {}
  const parsedMascot = parseMascotSettings(userMascot)

  return {
    window:
      parsedWindow?.width !== undefined && parsedWindow.height !== undefined
        ? parsedWindow
        : { ...DEFAULT_WINDOW_BOUNDS },
    mascot: {
      enabled: parsedMascot?.enabled ?? DEFAULT_MASCOT_SETTINGS.enabled,
      size: parsedMascot?.size ?? DEFAULT_MASCOT_SETTINGS.size,
      shape: parsedMascot?.shape ?? DEFAULT_MASCOT_SETTINGS.shape,
      color: parsedMascot?.color ?? DEFAULT_MASCOT_SETTINGS.color,
      badgeColor: parsedMascot?.badgeColor ?? DEFAULT_MASCOT_SETTINGS.badgeColor,
      ...(parsedMascot?.x !== undefined ? { x: parsedMascot.x } : {}),
      ...(parsedMascot?.y !== undefined ? { y: parsedMascot.y } : {})
    },
    tickets: {
      table: {
        columnLabels: mergedLabels,
        columnValueBadge: resolveColumnValueBadgeDefaults(
          parseColumnValueBadgeDefaults(userTable.columnValueBadge)
        ),
        columnOrder: parseColumnOrder(userTable.columnOrder),
        hiddenColumns: parseHiddenColumns(userTable.hiddenColumns),
        pinnedColumns: parsePinnedColumns(userTable.pinnedColumns),
        columnWidths: parseColumnWidths(userTable.columnWidths),
        columnFilters: parseColumnFilters(userTable.columnFilters),
        columnValues: isRecord(userTable.columnValues)
          ? (parseColumnValues(userTable.columnValues) ?? {})
          : TICKET_COLUMN_VALUES_DEFAULTS
      }
    },
    workflow: {
      ticketsOutputSplit:
        parseWorkflowTicketsOutputSplit(userWorkflow.ticketsOutputSplit) ??
        UI_SETTINGS_DEFAULTS.workflow!.ticketsOutputSplit,
      aboutOutputSplit:
        parseWorkflowTicketsOutputSplit(userWorkflow.aboutOutputSplit) ??
        UI_SETTINGS_DEFAULTS.workflow!.aboutOutputSplit
    },
    automations: {
      panelSplit:
        parseAutomationsPanelSplit(userAutomations.panelSplit) ??
        UI_SETTINGS_DEFAULTS.automations!.panelSplit
    },
    updates: {
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

const UI_SETTINGS_EXAMPLE_DOCUMENT: UiSettings = {
  window: { ...DEFAULT_WINDOW_BOUNDS },
  mascot: {
    enabled: DEFAULT_MASCOT_SETTINGS.enabled,
    size: DEFAULT_MASCOT_SETTINGS.size,
    shape: DEFAULT_MASCOT_SETTINGS.shape,
    color: DEFAULT_MASCOT_SETTINGS.color,
    badgeColor: DEFAULT_MASCOT_SETTINGS.badgeColor
  },
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
      columnLabels: {
        id_reclamation: "N° d'affaire",
        id_locataire: 'Locataire',
        motif: 'Motif'
      },
      columnOrder: ['id_reclamation', 'motif', 'id_locataire', 'id_lot'],
      pinnedColumns: ['id_reclamation', 'id_locataire', 'id_lot'],
      columnWidths: {
        description: 320,
        motif: 240
      },
      columnFilters: {
        motif: ['fuite']
      },
      columnValueBadge: {
        fontWeight: 500
      },
      columnValues: {
        avancement: {
          'aucun traitement': { bgColor: '#EED1A2', textColor: '#906008' },
          'en cours': { bgColor: '#B5C2F4', textColor: '#2A40A0' },
          terminé: { bgColor: '#A1D1C0', textColor: '#0A6850' }
        },
        statut: {
          ouvert: { bgColor: '#B5C2F4', textColor: '#2A40A0' },
          clos: { bgColor: '#A1D1C0', textColor: '#0A6850' },
          annulé: { bgColor: '#DAAFC0', textColor: '#882858' },
          nouveau: { bgColor: '#9ED4CC', textColor: '#087068' }
        },
        degre_urgence: {
          urgent: { bgColor: '#EAB0B4', textColor: '#B02838' },
          normal: { bgColor: '#AEBCC0', textColor: '#34404C' }
        },
        type_affaire: {
          réclamation: { bgColor: '#EAB0B4', textColor: '#B02838' },
          demande: { bgColor: '#B5C2F4', textColor: '#2A40A0' },
          incident: { bgColor: '#EED1A2', textColor: '#906008' }
        }
      }
    }
  }
}

export const UI_SETTINGS_EXAMPLE = formatUiSettingsFileContent(UI_SETTINGS_EXAMPLE_DOCUMENT)
