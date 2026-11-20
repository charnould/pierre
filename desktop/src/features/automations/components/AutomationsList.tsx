import { ChevronDown, Pin, Plus, Search, Square, Workflow } from 'lucide-react'

import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import { AutomationRunsMenu } from '@/features/automations/components/AutomationRunsMenu'
import type { Automation } from '@/features/automations/lib/automation-types'
import {
  AUTOMATION_SORT_OPTIONS,
  type AutomationSortKey
} from '@/features/automations/lib/sort-automations'
import { CollaboratorAccessAvatars } from '@/shared/components/CollaboratorAccessAvatars'
import { DirectoryList, DirectoryRow } from '@/shared/components/DirectoryList'
import { DirectoryListChrome } from '@/shared/components/DirectoryListChrome'
import { TableCellValue } from '@/shared/components/table/TableCellValue'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'
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
  onStopRun: (automation: Automation) => void
  onOpenRun: (target: ReaderTarget) => void
}

function AutomationItem({
  automation,
  url,
  selected = false,
  onSelectAutomation,
  onTogglePin,
  onStopRun,
  onOpenRun
}: AutomationItemProps) {
  const lastDate = formatGenerationDate(automation.lastRunDate)
  const outcome = runOutcomeDisplay(automation)

  return (
    <DirectoryRow selected={selected} onSelect={() => onSelectAutomation(automation)}>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{automation.name}</p>
        <p className="text-muted-foreground max-h-[2lh] overflow-hidden text-xs text-balance">
          {automation.description || '—'}
        </p>
      </div>
      <CollaboratorAccessAvatars owner={automation.owner} mentions={automation.mentions} />
      <span className="flex items-center gap-1 text-xs whitespace-nowrap">
        {automation.status === 'running' ? (
          <>
            <Badge variant="secondary">
              <Spinner data-icon="inline-start" />
              En cours
            </Badge>
            {automation.canManage ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Interrompre la génération"
                      onClick={(event) => {
                        event.stopPropagation()
                        onStopRun(automation)
                      }}
                    />
                  }
                >
                  <Square />
                </TooltipTrigger>
                <TooltipContent>Interrompre la génération</TooltipContent>
              </Tooltip>
            ) : null}
          </>
        ) : (
          <>
            <span className="tabular-nums">{lastDate}</span>
            {outcome ? <TableCellValue display={outcome} /> : null}
            <span className="text-muted-foreground" aria-hidden>
              →
            </span>
            <span className="tabular-nums">{formatGenerationDate(automation.nextRunDate)}</span>
          </>
        )}
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
                  !automation.pinned &&
                    'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
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
  onStopRun: (automation: Automation) => void
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
  onStopRun,
  onNewAutomation,
  onOpenRun
}: AutomationsListProps) {
  useOrgUsers(url)

  const countLabel = `${automations.length} automatisation${automations.length === 1 ? '' : 's'}`

  return (
    <section className="bg-background flex w-full min-w-0 flex-col [&:first-child>header]:border-t-0">
      <DirectoryListChrome
        title="Automatisations"
        countLabel={countLabel}
        searchLabel="Rechercher une automatisation"
        query={query}
        onQueryChange={onQueryChange}
        sortKey={sortKey}
        sortOptions={AUTOMATION_SORT_OPTIONS}
        onSortKeyChange={onSortKeyChange}
        onNew={onNewAutomation}
      />
      <div className="bg-background w-full min-w-0">
        {automations.length === 0 && normalizedQuery ? (
          <Empty className="min-h-60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
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
                <Workflow />
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
                onStopRun={onStopRun}
                onOpenRun={onOpenRun}
              />
            ))}
          </DirectoryList>
        )}
      </div>
    </section>
  )
}
