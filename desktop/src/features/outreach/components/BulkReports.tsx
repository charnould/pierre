import { ArrowLeft } from 'lucide-react'
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject
} from 'react'

import { RepaymentActivityDrawer } from '@/features/activity/components/RepaymentActivityDrawer'
import { useConditionalPolling } from '@/features/outreach/hooks/useConditionalPolling'
import { formatBulkOperationDate } from '@/features/outreach/lib/labels'
import {
  bulkReportRunMeta,
  reportItemChannel,
  reportItemDetail,
  reportItemOutcome,
  reportItemStatusDisplay
} from '@/features/outreach/lib/report-display'
import { CartoonBulkSelectFiles } from '@/shared/components/icons/koboyo-empty'
import { TableCellValue } from '@/shared/components/table/TableCellValue'
import { VirtualizedTableBody } from '@/shared/components/table/VirtualizedTableBody'
import { Button } from '@/shared/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'
import { TableCell, TableRow } from '@/shared/components/ui/table'
import { cn } from '@/shared/lib/utils'
import type {
  BulkOperationSummary,
  BulkReportDetail,
  BulkReportItem
} from '@/shared/types/bulk-operations'

const titleType = 'font-sans text-xl leading-6 font-semibold tracking-tight text-balance'
const metaType =
  'shrink-0 font-sans text-xl leading-6 font-medium tracking-tight text-muted-foreground'

interface SelectedItem {
  itemId: string
  activityId?: number
}

export function BulkReportItemRow({
  item,
  index,
  selected,
  measureRef,
  onSelect
}: {
  item: BulkReportItem
  index: number
  selected?: boolean
  measureRef?: (node: Element | null) => void
  onSelect?: (item: BulkReportItem) => void
}) {
  return (
    <TableRow
      data-index={index}
      ref={measureRef}
      className={onSelect ? 'cursor-pointer' : undefined}
      data-state={selected ? 'selected' : undefined}
      onClick={onSelect ? () => onSelect(item) : undefined}
    >
      <TableCell className="text-start">{item.itemId}</TableCell>
      <TableCell className="text-start whitespace-normal">{reportItemChannel(item)}</TableCell>
      <TableCell className="text-start">
        <TableCellValue display={reportItemStatusDisplay(item.reportStatus)} />
      </TableCell>
      <TableCell className="text-start whitespace-normal">{reportItemOutcome(item)}</TableCell>
      <TableCell className="text-start whitespace-normal">{reportItemDetail(item)}</TableCell>
    </TableRow>
  )
}

export function BulkReportRunSection({
  detail,
  selectedItemId,
  scrollRef,
  onSelectItem
}: {
  detail: BulkReportDetail
  selectedItemId?: string | null
  scrollRef: RefObject<HTMLElement | null>
  onSelectItem: (item: BulkReportItem) => void
}) {
  const headerRef = useRef<HTMLElement>(null)
  const [chromeHeight, setChromeHeight] = useState(0)
  const meta = bulkReportRunMeta(detail.report)

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return

    const sync = () => setChromeHeight(Math.ceil(el.getBoundingClientRect().height))
    sync()

    const observer = new ResizeObserver(sync)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      className="bg-background flex w-full min-w-0 flex-col [&:first-child>header]:border-t-0"
      style={{ '--run-chrome-height': `${chromeHeight}px` } as CSSProperties}
    >
      <header
        ref={headerRef}
        className="border-border bg-background sticky top-0 z-20 flex shrink-0 flex-wrap items-baseline gap-2 border-t border-b py-2 ps-4 pe-2"
      >
        <h3 className={cn('m-0 tabular-nums', titleType)}>
          {formatBulkOperationDate(detail.report.confirmedAt)}
        </h3>
        {meta.map((part, index) => (
          <span key={`${index}-${part}`} className="flex min-w-0 items-baseline gap-2">
            <span className={metaType} aria-hidden>
              ·
            </span>
            <span className={cn(metaType, 'min-w-0 truncate tabular-nums')}>{part}</span>
          </span>
        ))}
      </header>
      <div className="bg-background w-full min-w-0">
        {detail.items.length === 0 ? (
          <Empty className="min-h-40">
            <EmptyHeader>
              <EmptyMedia variant="icon" size="sm">
                <CartoonBulkSelectFiles />
              </EmptyMedia>
              <EmptyTitle className="text-sm leading-5 font-medium">
                Aucun élément dans cette exécution.
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <table className="w-full table-fixed font-sans text-[0.8125rem] leading-5 tabular-nums">
            <thead
              className="bg-background text-muted-foreground sticky z-10 text-[0.6875rem]"
              style={{ top: 'var(--run-chrome-height, 0px)' }}
            >
              <tr className="border-border border-b">
                <th className="h-8 w-32 px-2 text-start font-medium">Identité</th>
                <th className="h-8 w-32 px-2 text-start font-medium">Canal ou mode</th>
                <th className="h-8 w-24 px-2 text-start font-medium">Statut</th>
                <th className="h-8 w-36 px-2 text-start font-medium">Résultat</th>
                <th className="h-8 px-2 text-start font-medium">Détail</th>
              </tr>
            </thead>
            <VirtualizedTableBody
              rows={detail.items}
              scrollRef={scrollRef}
              columnCount={5}
              estimateSize={32}
              renderRow={(item, { index, measureRef }) => (
                <BulkReportItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  selected={item.itemId === selectedItemId}
                  measureRef={measureRef}
                  onSelect={onSelectItem}
                />
              )}
            />
          </table>
        )}
      </div>
    </section>
  )
}

interface Props {
  url: string
  operation: BulkOperationSummary
  userLogin: string
  onBack: () => void
}

export function BulkReports({ url, operation, userLogin, onBack }: Props) {
  const [details, setDetails] = useState<BulkReportDetail[]>([])
  const [loaded, setLoaded] = useState(false)
  const [selected, setSelected] = useState<SelectedItem | null>(null)
  const [sheetOpenToken, setSheetOpenToken] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchReports = useCallback(async () => {
    const response = await window.api?.getBulkOperationReports({
      url,
      id: operation.id
    })
    if (!response) throw new Error('Rapports indisponibles')
    setLoaded(true)
    return response.data
  }, [operation.id, url])
  const updateReports = useCallback((data: BulkReportDetail[]) => setDetails(data), [])
  const hasRunningReport = useCallback(
    (data: BulkReportDetail[]) => data.some((detail) => detail.report.status === 'in_progress'),
    []
  )

  useConditionalPolling({
    fetchData: fetchReports,
    onData: updateReports,
    shouldPoll: hasRunningReport
  })

  function handleSelectItem(item: BulkReportItem) {
    setSelected({
      itemId: item.itemId,
      activityId: item.currentActivityId ?? undefined
    })
    setSheetOpenToken((token) => token + 1)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-border bg-background flex shrink-0 items-center gap-2 border-b py-2 ps-2 pe-2">
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Retour" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h2 className={cn('m-0', titleType)}>Historique</h2>
          <span className={metaType} aria-hidden>
            ·
          </span>
          <span className={cn(metaType, 'min-w-0 truncate')}>{operation.name}</span>
        </div>
      </header>
      <div
        ref={scrollRef}
        className="flex min-h-0 w-full min-w-0 flex-1 scroll-pb-4 flex-col overflow-x-hidden overflow-y-auto overscroll-contain pb-6"
      >
        {!loaded ? (
          <div className="flex justify-center py-6">
            <Spinner aria-label="Chargement des rapports" />
          </div>
        ) : details.length === 0 ? (
          <Empty className="min-h-60">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CartoonBulkSelectFiles />
              </EmptyMedia>
              <EmptyTitle>Aucune exécution</EmptyTitle>
              <EmptyDescription>
                Les rapports apparaîtront après la première application de ce traitement.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          details.map((detail) => (
            <BulkReportRunSection
              key={detail.report.executionId}
              detail={detail}
              selectedItemId={selected?.itemId}
              scrollRef={scrollRef}
              onSelectItem={handleSelectItem}
            />
          ))
        )}
      </div>
      {selected ? (
        <RepaymentActivityDrawer
          url={url}
          userLogin={userLogin}
          tenantId={selected.itemId}
          notificationId={selected.activityId}
          sheetOpenToken={sheetOpenToken}
          embedded={false}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  )
}
