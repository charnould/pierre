import { repaymentSetup } from '@/shared/lib/instance-customization'
import { generateColumnValueStyles } from '@/shared/lib/ui-settings/column-value-palette'
import {
  normalizeColumnValueKey,
  parseHexColor,
  type ColumnValueStyle
} from '@/shared/lib/ui-settings/tickets-table'

type RawRepaymentAction =
  | string
  | {
      label: string
      color?: { bgColor: string; textColor: string }
    }

type RawRepaymentActions = {
  dossier: readonly RawRepaymentAction[]
  bulk_operations: readonly RawRepaymentAction[]
}

export type RepaymentActionOption = {
  id: string
  label: string
  color: ColumnValueStyle
}

function parseConfigColor(
  raw: { bgColor: string; textColor: string } | undefined
): ColumnValueStyle | undefined {
  if (!raw) return undefined
  const bgColor = parseHexColor(raw.bgColor)
  const textColor = parseHexColor(raw.textColor)
  if (!bgColor || !textColor) return undefined
  return { bgColor, textColor }
}

function normalizeRawAction(entry: RawRepaymentAction): {
  label: string
  color?: { bgColor: string; textColor: string }
} {
  return typeof entry === 'string' ? { label: entry } : entry
}

function buildActionOptions(raw: readonly RawRepaymentAction[]): RepaymentActionOption[] {
  const entries = raw.map(normalizeRawAction)
  const autoColors = generateColumnValueStyles(
    entries.map((entry) => entry.label),
    { random: () => 0.42 }
  )

  return entries.map((entry) => {
    const colorKey = normalizeColumnValueKey(entry.label)
    const color = parseConfigColor(entry.color) ??
      autoColors[colorKey] ??
      autoColors[entry.label] ?? { bgColor: '#E8E8E8', textColor: '#333333' }

    return {
      id: entry.label,
      label: entry.label,
      color
    }
  })
}

function rawActions(): RawRepaymentActions {
  return repaymentSetup().actions as RawRepaymentActions
}

export function repaymentDossierActionOptions(): RepaymentActionOption[] {
  return buildActionOptions(rawActions().dossier)
}

export function repaymentBulkActionOptions(): RepaymentActionOption[] {
  return buildActionOptions(rawActions().bulk_operations)
}

export function repaymentActionOptions(): RepaymentActionOption[] {
  return [...repaymentDossierActionOptions(), ...repaymentBulkActionOptions()]
}

/** Libellé métier stocké tel quel dans les activités. */
export type RepaymentActionId = string

function actionById(): Record<RepaymentActionId, RepaymentActionOption> {
  return Object.fromEntries(repaymentActionOptions().map((option) => [option.id, option]))
}

function actionByLabel(): Record<string, RepaymentActionOption> {
  return Object.fromEntries(repaymentActionOptions().map((option) => [option.label, option]))
}

export function isRepaymentActionId(value: string): value is RepaymentActionId {
  return value.trim().length > 0
}

export function getRepaymentActionMeta(id: RepaymentActionId): RepaymentActionOption {
  return (
    actionById()[id] ?? {
      id,
      label: id,
      color: { bgColor: '#E8E8E8', textColor: '#333333' }
    }
  )
}

export function getRepaymentActionByLabel(label: string): RepaymentActionOption | undefined {
  return actionByLabel()[label]
}
