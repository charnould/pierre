import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import {
  ColumnHeaderColorMenuItems,
  ColumnHeaderLayoutMenuItems,
  ColumnHeaderOptionsTrigger,
  type AnyPierreColumn,
  type AnyPierreTable
} from '@/shared/components/table/column-header-options-menu'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import {
  clearColumnValueStyles,
  columnColorizeButtonLabel,
  generateColumnValueStyles,
  hasColumnValueStyles
} from '@/shared/lib/ui-settings/column-value-palette'
import {
  facetFilterUnavailableMessage,
  formatFacetLabel,
  normalizeColumnValueKey
} from '@/shared/lib/ui-settings/tickets-table'

const FACET_SEARCH_DEBOUNCE_MS = 300
const EMPTY_FACET_VALUES: string[] = []

interface Props {
  column?: AnyPierreColumn
  table?: AnyPierreTable
  url: string | undefined
  columnName: string
  columnLabel: string
  selected: string[]
  onChange: (values: string[]) => void
  compact?: boolean
  enableColorize?: boolean
  enableFacets?: boolean
  lockedColumnIds?: ReadonlySet<string>
}

export function filterFacetValues(values: string[], search: string): string[] {
  const q = search.trim().toLowerCase()
  if (!q) return values
  return values.filter((value) => {
    const label = formatFacetLabel(value).toLowerCase()
    return label.startsWith(q)
  })
}

export function shouldFetchFacetsWithQuery(filterable: boolean | null, search: string): boolean {
  return filterable === false && search.trim().length > 0
}

export function canShowFacetValueList(
  filterable: boolean | null,
  search: string,
  loading: boolean
): boolean {
  if (filterable === false) return search.trim().length > 0 && !loading
  return !loading
}

export function TicketColumnFilter({
  column,
  table,
  url,
  columnName,
  columnLabel,
  selected,
  onChange,
  compact = false,
  enableColorize = false,
  enableFacets = true,
  lockedColumnIds
}: Props) {
  const { settings, patchTicketsTable } = useUiSettings()
  const columnValues = settings.tickets?.table?.columnValues

  const [open, setOpen] = useState(false)
  const [colorizing, setColorizing] = useState(false)
  const [search, setSearch] = useState('')
  const [facetSnapshot, setFacetSnapshot] = useState<{
    key: string
    values: string[]
    filterable: boolean | null
    totalDistinct: number
  }>({ key: '', values: [], filterable: null, totalDistinct: 0 })

  const sorted = column?.getIsSorted() ?? false
  const facetKey = open && enableFacets && url ? `${url}\0${columnName}` : ''
  const allValues = facetSnapshot.key === facetKey ? facetSnapshot.values : EMPTY_FACET_VALUES
  const filterable = facetSnapshot.key === facetKey ? facetSnapshot.filterable : null
  const totalDistinct = facetSnapshot.key === facetKey ? facetSnapshot.totalDistinct : 0
  const loading = Boolean(facetKey) && facetSnapshot.key !== facetKey

  useEffect(() => {
    if (!open || !enableFacets || !url || !window.api?.getTicketFacets) return
    const capturedKey = `${url}\0${columnName}`
    let cancelled = false
    void window.api.getTicketFacets({ url, column: columnName }).then((res) => {
      if (cancelled) return
      setFacetSnapshot({
        key: capturedKey,
        values: res?.values ?? [],
        filterable: res?.filterable ?? true,
        totalDistinct: res?.total ?? res?.values?.length ?? 0
      })
    })
    return () => {
      cancelled = true
    }
  }, [open, enableFacets, url, columnName])

  useEffect(() => {
    if (!open || !enableFacets || !url || !window.api?.getTicketFacets) return
    if (filterable !== false) return
    const q = search.trim()
    if (!q) return
    const capturedKey = `${url}\0${columnName}`
    const timer = window.setTimeout(() => {
      void window.api.getTicketFacets({ url, column: columnName, q }).then((res) => {
        setFacetSnapshot({
          key: capturedKey,
          values: res?.values ?? [],
          filterable: res?.filterable ?? true,
          totalDistinct: res?.total ?? res?.values?.length ?? 0
        })
      })
    }, FACET_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [open, enableFacets, filterable, search, url, columnName])

  if (!open && search) setSearch('')
  if (!open && facetSnapshot.key !== '') {
    setFacetSnapshot({ key: '', values: [], filterable: null, totalDistinct: 0 })
  }

  const displayedValues = useMemo(() => {
    if (filterable === false) return allValues
    return filterFacetValues(allValues, search)
  }, [allValues, search, filterable])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const hasActiveFilter = selected.length > 0
  const hasExistingStyles = useMemo(
    () => hasColumnValueStyles(columnValues, columnName),
    [columnValues, columnName]
  )
  const colorizeLabel = columnColorizeButtonLabel(hasExistingStyles)
  const showMenuHighlight = hasActiveFilter || Boolean(sorted)

  const toggleValue = (value: string) => {
    const next = selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]
    onChange(next)
  }

  const handleClear = () => {
    onChange([])
    setOpen(false)
  }

  const handleColorize = async () => {
    if (!enableColorize || filterable !== true || allValues.length === 0 || colorizing) return
    setColorizing(true)
    try {
      const generated = generateColumnValueStyles(allValues)
      const existing = settings.tickets?.table?.columnValues ?? {}
      const columnKey = normalizeColumnValueKey(columnName)
      await patchTicketsTable({
        columnValues: {
          ...existing,
          [columnKey]: generated
        }
      })
    } finally {
      setColorizing(false)
    }
  }

  const handleDecolorize = async () => {
    if (!enableColorize || filterable !== true || !hasExistingStyles) return
    const existing = settings.tickets?.table?.columnValues ?? {}
    await patchTicketsTable({
      columnValues: clearColumnValueStyles(existing, columnName)
    })
  }

  const showColorize =
    enableFacets && enableColorize && filterable === true && allValues.length > 0 && !loading
  const showValueList = enableFacets && canShowFacetValueList(filterable, search, loading)
  const showSearchHint =
    enableFacets &&
    filterable === false &&
    !loading &&
    search.trim().length === 0 &&
    totalDistinct > 0
  const emptyListMessage = showSearchHint
    ? facetFilterUnavailableMessage(totalDistinct)
    : 'Aucune valeur'

  let facetBody: ReactNode = null
  if (enableFacets) {
    facetBody = (
      <>
        <DropdownMenuSeparator />
        <div className="px-1.5 py-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            aria-label="Rechercher une valeur"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        {showSearchHint ? (
          <p className="text-muted-foreground px-2 py-1.5 text-xs">
            {facetFilterUnavailableMessage(totalDistinct)}
          </p>
        ) : null}
        {showColorize ? (
          <>
            <DropdownMenuSeparator />
            <ColumnHeaderColorMenuItems
              colorizeLabel={colorizeLabel}
              colorizing={colorizing}
              onColorize={handleColorize}
              onDecolorize={hasExistingStyles ? handleDecolorize : undefined}
            />
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={displayedValues.length === 0}
            onClick={() => onChange([...displayedValues])}
          >
            Tout sélectionner
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleClear}>Tout effacer</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {loading ? (
            <DropdownMenuItem disabled>Chargement…</DropdownMenuItem>
          ) : !showValueList ? null : displayedValues.length === 0 ? (
            <DropdownMenuItem disabled>{emptyListMessage}</DropdownMenuItem>
          ) : (
            displayedValues.map((value) => (
              <DropdownMenuCheckboxItem
                key={value || '__empty__'}
                checked={selectedSet.has(value)}
                onCheckedChange={() => toggleValue(value)}
              >
                {formatFacetLabel(value)}
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuGroup>
      </>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        render={(triggerProps) => (
          <ColumnHeaderOptionsTrigger
            {...triggerProps}
            columnLabel={columnLabel}
            compact={compact}
            highlighted={showMenuHighlight}
            badgeCount={hasActiveFilter ? selected.length : 0}
          />
        )}
      />
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{columnLabel}</DropdownMenuLabel>
        </DropdownMenuGroup>
        {column && table ? (
          <>
            <DropdownMenuSeparator />
            <ColumnHeaderLayoutMenuItems
              column={column}
              table={table}
              lockedColumnIds={lockedColumnIds}
            />
          </>
        ) : null}
        {facetBody}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
