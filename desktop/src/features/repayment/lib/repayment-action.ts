import { repaymentSetup } from '@/shared/lib/instance-customization'
import { generateColumnValueStyles } from '@/shared/lib/ui-settings/column-value-palette'
import {
  type ColumnValueStyle,
  normalizeColumnValueKey
} from '@/shared/lib/ui-settings/tickets-table'

export type RepaymentActionOption = {
  id: string
  label: string
  color: ColumnValueStyle
}

function buildActionOptions(labels: readonly string[]): RepaymentActionOption[] {
  const names = [...labels]
  const autoColors = generateColumnValueStyles(names, { random: () => 0.42 })

  return labels.map((label) => {
    const colorKey = normalizeColumnValueKey(label)
    return {
      id: label,
      label,
      color: autoColors[colorKey] ??
        autoColors[label] ?? { bgColor: '#E8E8E8', textColor: '#333333' }
    }
  })
}

export function repaymentDossierActionOptions(): RepaymentActionOption[] {
  return buildActionOptions(repaymentSetup().caseActions)
}

export function repaymentBulkActionOptions(): RepaymentActionOption[] {
  return buildActionOptions(repaymentSetup().batchActions)
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
