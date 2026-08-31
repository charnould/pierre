import { NotificationRepaymentMeta } from '@/features/repayment/components/NotificationRepaymentMeta'
import { RepaymentTimelineMessageBody } from '@/features/repayment/components/RepaymentTimelineMessageBody'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/shared/components/ui/empty'
import { Item, ItemContent, ItemGroup, ItemTitle } from '@/shared/components/ui/item'
import type { Activite } from '@/shared/types/activites'

interface Props {
  rows: Activite[]
  loading?: boolean
  highlightId?: number
}

export function NotificationTimeline({ rows, loading, highlightId }: Props) {
  if (loading && rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyDescription>Chargement…</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  if (rows.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="text-sm leading-5 font-medium">
            Aucun message pour ce dossier.
          </EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ItemGroup>
      {rows.map((row) => (
        <Item
          key={row.id}
          data-activity-id={row.id}
          variant={highlightId === row.id ? 'muted' : 'default'}
        >
          <ItemContent className="min-w-0">
            <ItemTitle className="flex-wrap">
              <time className="text-muted-foreground tabular-nums" dateTime={row.date_creation}>
                {new Date(row.date_creation).toLocaleString('fr-FR')}
              </time>
              <NotificationRepaymentMeta row={row} showChannel />
              <span className="text-muted-foreground ms-auto shrink-0">{row.auteur}</span>
            </ItemTitle>
            <RepaymentTimelineMessageBody row={row} />
          </ItemContent>
        </Item>
      ))}
    </ItemGroup>
  )
}
