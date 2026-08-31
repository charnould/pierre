import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { BulkEditor } from '@/features/outreach/components/BulkEditor'
import { BulkOperationsList } from '@/features/outreach/components/BulkOperationsList'
import { BulkReports } from '@/features/outreach/components/BulkReports'
import {
  DEFAULT_BULK_OPERATION_SORT,
  matchesBulkOperationSearch,
  sortBulkOperations,
  type BulkOperationSortKey
} from '@/features/outreach/lib/sort-bulk-operations'
import { Spinner } from '@/shared/components/ui/spinner'
import { cn } from '@/shared/lib/utils'
import type { BulkOperationRecord, BulkOperationSummary } from '@/shared/types/bulk-operations'
import type { Settings } from '@/shared/types/settings'

interface Props {
  hidden: boolean
  settings: Settings
  userLogin: string
}

export function BulkOperationsView({ hidden, settings, userLogin }: Props) {
  const [bulkOperations, setBulkOperations] = useState<BulkOperationSummary[]>([])
  const [selectedBulkOperationId, setSelectedBulkOperationId] = useState<string | null>(null)
  const [selectedBulkOperation, setSelectedBulkOperation] = useState<BulkOperationRecord | null>(
    null
  )
  const [loadingBulkOperation, setLoadingBulkOperation] = useState(false)
  const [isCreatingBulkOperation, setIsCreatingBulkOperation] = useState(false)
  const [reportsBulkOperationId, setReportsBulkOperationId] = useState<string | null>(null)
  const [bulkOperationQuery, setBulkOperationQuery] = useState('')
  const [bulkOperationSortKey, setBulkOperationSortKey] = useState<BulkOperationSortKey>(
    DEFAULT_BULK_OPERATION_SORT
  )
  const detailRequest = useRef(0)

  const normalizedBulkOperationQuery = bulkOperationQuery.trim().toLowerCase()
  const filteredBulkOperations = useMemo(() => {
    const rows = normalizedBulkOperationQuery
      ? bulkOperations.filter((row) =>
          matchesBulkOperationSearch(row, normalizedBulkOperationQuery)
        )
      : bulkOperations
    return sortBulkOperations(rows, bulkOperationSortKey)
  }, [bulkOperationSortKey, bulkOperations, normalizedBulkOperationQuery])

  const editingBulkOperation = isCreatingBulkOperation || selectedBulkOperationId !== null
  const reportsBulkOperation =
    bulkOperations.find((row) => row.id === reportsBulkOperationId) ?? null
  const showingBulkReports = reportsBulkOperationId !== null

  const refreshBulkOperations = useCallback(async () => {
    if (!settings.url || !window.api?.getBulkOperations) {
      return
    }
    const res = await window.api.getBulkOperations({ url: settings.url })
    if (!res) return
    setBulkOperations([...new Map(res.data.map((row) => [row.id, row])).values()])
  }, [settings.url])

  useEffect(() => {
    if (
      hidden ||
      editingBulkOperation ||
      showingBulkReports ||
      !settings.url ||
      !window.api?.getBulkOperations
    ) {
      return
    }
    const url = settings.url
    void window.api.getBulkOperations({ url }).then((res) => {
      if (!res) return
      setBulkOperations([...new Map(res.data.map((row) => [row.id, row])).values()])
    })
    const id = window.setInterval(() => {
      void refreshBulkOperations()
    }, 15_000)
    return () => window.clearInterval(id)
  }, [editingBulkOperation, hidden, refreshBulkOperations, settings.url, showingBulkReports])

  function closeBulkEditor() {
    detailRequest.current += 1
    setSelectedBulkOperationId(null)
    setSelectedBulkOperation(null)
    setLoadingBulkOperation(false)
    setIsCreatingBulkOperation(false)
    void refreshBulkOperations()
  }

  function closeBulkReports() {
    setReportsBulkOperationId(null)
    void refreshBulkOperations()
  }

  async function handleSelectBulkOperation(row: BulkOperationSummary) {
    setReportsBulkOperationId(null)
    setIsCreatingBulkOperation(false)
    setSelectedBulkOperationId(row.id)
    if ('definition' in row) {
      setSelectedBulkOperation(row as BulkOperationRecord)
      setLoadingBulkOperation(false)
      return
    }
    setSelectedBulkOperation(null)
    setLoadingBulkOperation(true)
    const request = ++detailRequest.current
    const response = await window.api?.getBulkOperation({
      url: settings.url ?? '',
      id: row.id
    })
    if (request !== detailRequest.current) return
    setLoadingBulkOperation(false)
    if (!response) {
      setSelectedBulkOperationId(null)
      return
    }
    setSelectedBulkOperation(response.data)
  }

  function handleNewBulkOperation() {
    setReportsBulkOperationId(null)
    setSelectedBulkOperationId(null)
    setSelectedBulkOperation(null)
    setIsCreatingBulkOperation(true)
  }

  function handleOpenBulkReports(row: BulkOperationSummary) {
    detailRequest.current += 1
    setSelectedBulkOperationId(null)
    setSelectedBulkOperation(null)
    setIsCreatingBulkOperation(false)
    setReportsBulkOperationId(row.id)
  }

  return (
    <div
      data-tab-panel
      className={cn(
        'relative min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background',
        hidden ? 'hidden' : 'flex'
      )}
    >
      {reportsBulkOperation && settings.url ? (
        <BulkReports
          url={settings.url}
          operation={reportsBulkOperation}
          userLogin={userLogin}
          onBack={closeBulkReports}
        />
      ) : loadingBulkOperation ? (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Spinner aria-label="Chargement du traitement" />
        </div>
      ) : editingBulkOperation &&
        settings.url &&
        (isCreatingBulkOperation || selectedBulkOperation) ? (
        <BulkEditor
          url={settings.url}
          record={isCreatingBulkOperation ? null : selectedBulkOperation}
          onBack={closeBulkEditor}
          onSaved={(row) => {
            setIsCreatingBulkOperation(false)
            setSelectedBulkOperationId(row.id)
            setSelectedBulkOperation(row)
            setBulkOperations((current) => {
              const without = current.filter((item) => item.id !== row.id)
              return [row, ...without]
            })
          }}
          onArchived={closeBulkEditor}
        />
      ) : hidden ? null : (
        <div className="flex min-h-0 w-full min-w-0 flex-1 scroll-pb-4 flex-col overflow-x-hidden overflow-y-auto overscroll-contain pb-6">
          <BulkOperationsList
            url={settings.url ?? ''}
            bulkOperations={filteredBulkOperations}
            query={bulkOperationQuery}
            normalizedQuery={normalizedBulkOperationQuery}
            onQueryChange={setBulkOperationQuery}
            sortKey={bulkOperationSortKey}
            onSortKeyChange={setBulkOperationSortKey}
            selectedId={selectedBulkOperationId}
            onSelect={handleSelectBulkOperation}
            onOpenReports={handleOpenBulkReports}
            onNew={handleNewBulkOperation}
          />
        </div>
      )}
    </div>
  )
}
