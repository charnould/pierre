import { CollaboratorChip } from '@/shared/components/inspector/collaborator-chip'
import {
  colorizeBadgeStyle,
  columnValueStyleToBadge,
  findColumnValueStyle,
  normalizeColumnValueKey,
  resolveColumnValueBadgeDefaults,
  type ColumnValuesConfig
} from '@/shared/lib/ui-settings/tickets-table'

interface Props {
  identity: string
  label: string
  columnValues?: ColumnValuesConfig
}

export function RepaymentGestionnaireCell({ identity, label, columnValues }: Props) {
  if (!identity) return <span>—</span>

  const columnStyle = findColumnValueStyle(
    columnValues,
    'gestionnaire',
    normalizeColumnValueKey(label)
  )

  return (
    <CollaboratorChip
      identity={identity}
      title={identity.includes('@') ? identity : undefined}
      className="max-w-full text-[0.8125rem]"
      style={
        columnStyle
          ? colorizeBadgeStyle(
              columnValueStyleToBadge(columnStyle, resolveColumnValueBadgeDefaults())
            )
          : undefined
      }
    />
  )
}
