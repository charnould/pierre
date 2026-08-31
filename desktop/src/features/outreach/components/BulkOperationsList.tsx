import { Plus } from 'lucide-react'

import { BulkOperationsListChrome } from '@/features/outreach/components/BulkOperationsListChrome'
import { formatBulkOperationDate } from '@/features/outreach/lib/labels'
import type { BulkOperationSortKey } from '@/features/outreach/lib/sort-bulk-operations'
import { DirectoryList, DirectoryRow } from '@/shared/components/DirectoryList'
import { CartoonBulkSelectFiles } from '@/shared/components/icons/koboyo-empty'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import { formatOrgCollaboratorLabel } from '@/shared/lib/org-users-cache'
import { lastBulkOperationEdit, type BulkOperationSummary } from '@/shared/types/bulk-operations'

interface Props {
  url: string
  bulkOperations: BulkOperationSummary[]
  query: string
  normalizedQuery: string
  onQueryChange: (query: string) => void
  sortKey: BulkOperationSortKey
  onSortKeyChange: (key: BulkOperationSortKey) => void
  selectedId?: string | null
  onSelect: (bulkOperation: BulkOperationSummary) => void
  onOpenReports: (bulkOperation: BulkOperationSummary) => void
  onNew: () => void
}

function LastEditor({ login, at }: { login: string; at: string }) {
  const avatar = useUserAvatar(login)
  const name = formatOrgCollaboratorLabel(login)
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Badge variant="outline" className="min-w-0 px-1.5">
        <UserAvatar photoUrl={avatar} name={name} login={login} size="sm" className="size-3.5!" />
        <span className="truncate">{name}</span>
      </Badge>
      <span className="text-xs whitespace-nowrap tabular-nums">{formatBulkOperationDate(at)}</span>
    </div>
  )
}

export function BulkOperationsList({
  url,
  bulkOperations,
  query,
  normalizedQuery,
  onQueryChange,
  sortKey,
  onSortKeyChange,
  selectedId = null,
  onSelect,
  onOpenReports,
  onNew
}: Props) {
  useOrgUsers(url)

  return (
    <section className="bg-background flex w-full min-w-0 flex-col [&:first-child>header]:border-t-0">
      <BulkOperationsListChrome
        visibleCount={bulkOperations.length}
        query={query}
        onQueryChange={onQueryChange}
        sortKey={sortKey}
        onSortKeyChange={onSortKeyChange}
        onNew={onNew}
      />
      <div className="bg-background w-full min-w-0">
        {bulkOperations.length === 0 && normalizedQuery ? (
          <Empty className="min-h-60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CartoonBulkSelectFiles />
              </EmptyMedia>
              <EmptyTitle>Aucun résultat</EmptyTitle>
              <EmptyDescription>
                Aucun traitement ne correspond à « {query.trim()} ».
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : bulkOperations.length === 0 ? (
          <Empty className="min-h-60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CartoonBulkSelectFiles />
              </EmptyMedia>
              <EmptyTitle>Traitez des locataires en lot</EmptyTitle>
              <EmptyDescription>
                Enregistrez une audience et ses messages, puis appliquez. Chaque exécution écrit les
                activités et fait avancer les dossiers.
              </EmptyDescription>
            </EmptyHeader>
            <Button type="button" variant="outline" onClick={onNew}>
              <Plus data-icon="inline-start" />
              Créer un traitement
            </Button>
          </Empty>
        ) : (
          <DirectoryList>
            {bulkOperations.map((bulkOperation) => {
              const last = lastBulkOperationEdit(bulkOperation.edits)
              return (
                <DirectoryRow
                  key={bulkOperation.id}
                  selected={bulkOperation.id === selectedId}
                  onSelect={() => onSelect(bulkOperation)}
                  className="grid-cols-[minmax(0,1fr)_minmax(12rem,auto)_8rem_7.5rem]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{bulkOperation.name}</p>
                    <p className="pierre-meta max-h-[2lh] overflow-hidden text-balance">
                      {bulkOperation.description || '—'}
                    </p>
                  </div>
                  {last ? (
                    <LastEditor login={last.by} at={last.at} />
                  ) : (
                    <span className="pierre-meta">—</span>
                  )}
                  <span className="text-xs whitespace-nowrap tabular-nums">
                    {bulkOperation.lastRunAt
                      ? formatBulkOperationDate(bulkOperation.lastRunAt)
                      : '—'}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenReports(bulkOperation)
                    }}
                  >
                    Historique
                  </Button>
                </DirectoryRow>
              )
            })}
          </DirectoryList>
        )}
      </div>
    </section>
  )
}
