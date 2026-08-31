import repaymentConfig from '@customization/repayments/config'

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

const RAW_ACTIONS = repaymentConfig.actions as RawRepaymentActions

export const REPAYMENT_DOSSIER_ACTION_OPTIONS = buildActionOptions(RAW_ACTIONS.dossier)
export const REPAYMENT_BULK_ACTION_OPTIONS = buildActionOptions(RAW_ACTIONS.bulk_operations)
export const REPAYMENT_ACTION_OPTIONS = [
  ...REPAYMENT_DOSSIER_ACTION_OPTIONS,
  ...REPAYMENT_BULK_ACTION_OPTIONS
]

/** Libellé métier stocké tel quel dans les activités. */
export type RepaymentActionId = string

const ACTION_BY_ID = Object.fromEntries(
  REPAYMENT_ACTION_OPTIONS.map((option) => [option.id, option])
) as Record<RepaymentActionId, RepaymentActionOption>

const ACTION_BY_LABEL = Object.fromEntries(
  REPAYMENT_ACTION_OPTIONS.map((option) => [option.label, option])
) as Record<string, RepaymentActionOption>

export function isRepaymentActionId(value: string): value is RepaymentActionId {
  return value.trim().length > 0
}

export function getRepaymentActionMeta(id: RepaymentActionId): RepaymentActionOption {
  return (
    ACTION_BY_ID[id] ?? {
      id,
      label: id,
      color: { bgColor: '#E8E8E8', textColor: '#333333' }
    }
  )
}

export function getRepaymentActionByLabel(label: string): RepaymentActionOption | undefined {
  return ACTION_BY_LABEL[label]
}
