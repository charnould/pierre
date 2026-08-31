import { ChevronDown, Pin, Plus } from 'lucide-react'

import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import { AutomationAccessAvatars } from '@/features/automations/components/AutomationAccessAvatars'
import { AutomationRunsMenu } from '@/features/automations/components/AutomationRunsMenu'
import { AutomationsListChrome } from '@/features/automations/components/AutomationsListChrome'
import type { Automation } from '@/features/automations/lib/automation-types'
import type { AutomationSortKey } from '@/features/automations/lib/sort-automations'
import { DirectoryList, DirectoryRow } from '@/shared/components/DirectoryList'
import { BetaAutomation, CartoonBulkSelectFiles } from '@/shared/components/icons/koboyo-empty'
import { TableCellValue } from '@/shared/components/table/TableCellValue'
import { Button } from '@/shared/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import { cn } from '@/shared/lib/utils'

import { formatGenerationDate, runOutcomeDisplay } from '../lib/automation-list-display'
import { isReportAutomation } from '../lib/automation-types'

interface AutomationItemProps {
  automation: Automation
  url?: string
  selected?: boolean
  onSelectAutomation: (automation: Automation) => void
  onTogglePin: (automation: Automation) => void
  onOpenRun: (target: ReaderTarget) => void
}

function AutomationItem({
  automation,
  url,
  selected = false,
  onSelectAutomation,
  onTogglePin,
  onOpenRun
}: AutomationItemProps) {
  const lastDate = formatGenerationDate(automation.lastRunDate)
  const outcome = runOutcomeDisplay(automation)

  return (
    <DirectoryRow selected={selected} onSelect={() => onSelectAutomation(automation)}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{automation.name}</p>
        <p className="pierre-meta max-h-[2lh] overflow-hidden text-balance">
          {automation.description || '—'}
        </p>
      </div>
      <AutomationAccessAvatars automation={automation} />
      <span className="flex items-center gap-1 text-xs whitespace-nowrap">
        <span className="tabular-nums">{lastDate}</span>
        {outcome ? <TableCellValue display={outcome} /> : null}
        <span className="text-muted-foreground" aria-hidden>
          →
        </span>
        <span className="tabular-nums">{formatGenerationDate(automation.nextRunDate)}</span>
      </span>
      <div className="flex items-center gap-1">
        {isReportAutomation(automation) ? (
          <AutomationRunsMenu automation={automation} url={url} onOpenRun={onOpenRun} />
        ) : (
          <span
            className="invisible inline-flex shrink-0 items-center p-0 text-xs font-normal"
            aria-hidden
          >
            Historique
            <ChevronDown data-icon="inline-end" />
          </span>
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                aria-label={automation.pinned ? 'Désépingler' : 'Épingler'}
                aria-pressed={automation.pinned}
                className={cn(
                  automation.pinned
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                )}
                onClick={(event) => {
                  event.stopPropagation()
                  onTogglePin(automation)
                }}
              />
            }
          >
            <Pin className={automation.pinned ? 'fill-current' : undefined} />
          </TooltipTrigger>
          <TooltipContent>{automation.pinned ? 'Désépingler' : 'Épingler'}</TooltipContent>
        </Tooltip>
      </div>
    </DirectoryRow>
  )
}

interface AutomationsListProps {
  automations: Automation[]
  url?: string
  agentName: string
  query: string
  normalizedQuery: string
  onQueryChange: (query: string) => void
  sortKey: AutomationSortKey
  onSortKeyChange: (key: AutomationSortKey) => void
  selectedAutomationId?: string | null
  onSelectAutomation: (automation: Automation) => void
  onTogglePin: (automation: Automation) => void
  onNewAutomation: () => void
  onOpenRun: (target: ReaderTarget) => void
}

export function AutomationsList({
  automations,
  url,
  agentName,
  query,
  normalizedQuery,
  onQueryChange,
  sortKey,
  onSortKeyChange,
  selectedAutomationId = null,
  onSelectAutomation,
  onTogglePin,
  onNewAutomation,
  onOpenRun
}: AutomationsListProps) {
  useOrgUsers(url)

  return (
    <section className="bg-background flex w-full min-w-0 flex-col [&:first-child>header]:border-t-0">
      <AutomationsListChrome
        visibleCount={automations.length}
        query={query}
        onQueryChange={onQueryChange}
        sortKey={sortKey}
        onSortKeyChange={onSortKeyChange}
        onNewAutomation={onNewAutomation}
      />
      <div className="bg-background w-full min-w-0">
        {automations.length === 0 && normalizedQuery ? (
          <Empty className="min-h-60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CartoonBulkSelectFiles />
              </EmptyMedia>
              <EmptyTitle>Aucun résultat</EmptyTitle>
              <EmptyDescription>
                Aucune automatisation ne correspond à « {query.trim()} ».
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : automations.length === 0 ? (
          <Empty className="min-h-60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BetaAutomation />
              </EmptyMedia>
              <EmptyTitle>Commencez à automatiser vos tâches</EmptyTitle>
              <EmptyDescription>
                Créez votre première automatisation pour laisser {agentName} travailler à votre
                place. Rapports, analyses, réponses… chaque exécution vous est notifiée
                automatiquement.
              </EmptyDescription>
            </EmptyHeader>
            <Button type="button" variant="outline" onClick={onNewAutomation}>
              <Plus data-icon="inline-start" />
              Créer une automatisation
            </Button>
          </Empty>
        ) : (
          <DirectoryList>
            {automations.map((automation) => (
              <AutomationItem
                key={automation.id}
                automation={automation}
                url={url}
                selected={automation.id === selectedAutomationId}
                onSelectAutomation={onSelectAutomation}
                onTogglePin={onTogglePin}
                onOpenRun={onOpenRun}
              />
            ))}
          </DirectoryList>
        )}
      </div>
    </section>
  )
}
