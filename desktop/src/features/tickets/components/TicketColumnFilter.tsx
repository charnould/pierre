import type { Column } from '@tanstack/react-table'
import { Filter } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { useUiSettings } from '@/contexts/UiSettingsContext'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuHint,
  DropdownMenuInput,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuStatus,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import {
  columnColorizeButtonLabel,
  generateColumnValueStyles,
  hasColumnValueStyles
} from '@/shared/lib/ui-settings/column-value-palette'
import {
  facetFilterUnavailableMessage,
  formatFacetLabel,
  normalizeColumnValueKey
} from '@/shared/lib/ui-settings/tickets-table'
import { cn } from '@/shared/lib/utils'
import type { TicketRow } from '@/shared/types'

const FACET_SEARCH_DEBOUNCE_MS = 300

interface Props {
  url: string | undefined
  column: string
  columnLabel: string
  selected: string[]
  onChange: (values: string[]) => void
  compact?: boolean
  enableColorize?: boolean
  sortColumn?: Column<TicketRow, unknown>
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
  url,
  column,
  columnLabel,
  selected,
  onChange,
  compact = false,
  enableColorize = false,
  sortColumn
}: Props) {
  const { settings, patchTicketsTable } = useUiSettings()
  const columnValues = settings.tickets?.table?.columnValues

  const [open, setOpen] = useState(false)
  const [allValues, setAllValues] = useState<string[]>([])
  const [filterable, setFilterable] = useState<boolean | null>(null)
  const [totalDistinct, setTotalDistinct] = useState(0)
  const [loading, setLoading] = useState(false)
  const [colorizing, setColorizing] = useState(false)
  const [search, setSearch] = useState('')

  const sorted = sortColumn?.getIsSorted() ?? false

  const loadFacets = useCallback(
    async (q?: string) => {
      if (!url || !window.api?.getTicketFacets) return
      setLoading(true)
      try {
        const res = await window.api.getTicketFacets({ url, column, q: q || undefined })
        setAllValues(res?.values ?? [])
        setFilterable(res?.filterable ?? true)
        setTotalDistinct(res?.total ?? res?.values?.length ?? 0)
      } finally {
        setLoading(false)
      }
    },
    [url, column]
  )

  useEffect(() => {
    if (!open) return
    void loadFacets()
  }, [open, loadFacets])

  useEffect(() => {
    if (!open || filterable !== false) return
    const q = search.trim()
    if (!q) {
      setAllValues([])
      return
    }
    const timer = window.setTimeout(() => {
      void loadFacets(q)
    }, FACET_SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [open, filterable, search, loadFacets])

  useEffect(() => {
    if (open) return
    setSearch('')
    setFilterable(null)
    setAllValues([])
    setTotalDistinct(0)
  }, [open])

  const displayedValues = useMemo(() => {
    if (filterable === false) return allValues
    return filterFacetValues(allValues, search)
  }, [allValues, search, filterable])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const hasActiveFilter = selected.length > 0
  const hasExistingStyles = useMemo(
    () => hasColumnValueStyles(columnValues, column),
    [columnValues, column]
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
      const columnKey = normalizeColumnValueKey(column)
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

  const filterTrigger = useMemo(
    () => (
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className={cn(
          'relative shrink-0 px-0',
          compact ? 'size-5' : 'size-6',
          showMenuHighlight && 'bg-primary/10 text-primary'
        )}
        aria-label={
          hasActiveFilter
            ? `Options ${columnLabel} — ${selected.length} valeur${selected.length > 1 ? 's' : ''} sélectionnée${selected.length > 1 ? 's' : ''}`
            : `Options ${columnLabel}`
        }
      >
        <Filter className={compact ? 'size-2.5' : 'size-3.5'} />
        {hasActiveFilter ? (
          <span
            className={cn(
              'bg-primary text-primary-foreground absolute flex items-center justify-center rounded-full leading-none font-medium ring-1 ring-background',
              compact
                ? 'top-px right-px size-2.5 text-[8px]'
                : 'top-0.5 right-0.5 size-3 text-[9px]'
            )}
          >
            {selected.length}
          </span>
        ) : null}
      </Button>
    ),
    [columnLabel, compact, hasActiveFilter, selected.length, showMenuHighlight]
  )

  const showColorize = enableColorize && filterable === true && allValues.length > 0 && !loading
  const showValueList = canShowFacetValueList(filterable, search, loading)
  const showSearchHint =
    filterable === false && !loading && search.trim().length === 0 && totalDistinct > 0
  const emptyListMessage = showSearchHint
    ? facetFilterUnavailableMessage(totalDistinct)
    : 'Aucune valeur'

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={filterTrigger} />
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{columnLabel}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          onKeyDown={(e) => e.stopPropagation()}
        />
        {showSearchHint ? (
          <DropdownMenuHint>{facetFilterUnavailableMessage(totalDistinct)}</DropdownMenuHint>
        ) : null}
        <DropdownMenuSeparator />
        {sortColumn ? (
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={sorted === 'asc'}
              onClick={() => sortColumn.toggleSorting(false)}
            >
              Trier croissant
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={sorted === 'desc'}
              onClick={() => sortColumn.toggleSorting(true)}
            >
              Trier décroissant
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!sorted} onClick={() => sortColumn.clearSorting()}>
              Supprimer le tri
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
        {sortColumn ? <DropdownMenuSeparator /> : null}
        {showColorize ? (
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={colorizing} onClick={() => void handleColorize()}>
              {colorizing ? 'Colorisation…' : colorizeLabel}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
        {showColorize ? <DropdownMenuSeparator /> : null}
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
            <DropdownMenuStatus>Chargement…</DropdownMenuStatus>
          ) : !showValueList ? null : displayedValues.length === 0 ? (
            <DropdownMenuStatus>{emptyListMessage}</DropdownMenuStatus>
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
