import { CollaboratorChip } from '@/shared/components/inspector/collaborator-chip'
import {
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
  const appearance = columnStyle
    ? columnValueStyleToBadge(columnStyle, resolveColumnValueBadgeDefaults())
    : undefined

  return (
    <CollaboratorChip
      identity={identity}
      title={identity.includes('@') ? identity : undefined}
      className="max-w-full"
      appearance={appearance}
    />
  )
}
