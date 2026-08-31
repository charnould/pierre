import { useMemo, useState, type ReactNode } from 'react'

import { OrgUserListItem } from '@/shared/components/OrgUserListItem'
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
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import {
  filterCollaboratorFacetValues,
  resolveOrgUserListFields
} from '@/shared/lib/org-user-list-item'
import {
  clearColumnValueStyles,
  columnColorizeButtonLabel,
  generateColumnValueStyles,
  hasColumnValueStyles
} from '@/shared/lib/ui-settings/column-value-palette'
import {
  normalizeColumnValueKey,
  type ColumnValuesConfig
} from '@/shared/lib/ui-settings/tickets-table'

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import {
  collectFilterFacets,
  formatRepaymentFacetLabel,
  isRepaymentColorizableColumn,
  type RepaymentColumnFilterGetters
} from '../lib/repayment-column-filters'
import type { RepaymentColumnId } from '../lib/repayment-table-columns'

interface Props {
  column: AnyPierreColumn
  table: AnyPierreTable
  columnId: RepaymentColumnId
  columnLabel: string
  selected: string[]
  onChange: (values: string[]) => void
  allRows: TenantRepaymentRow[]
  getters?: RepaymentColumnFilterGetters
  columnValues?: ColumnValuesConfig
  onColumnValuesChange?: (
    updater: ColumnValuesConfig | ((prev: ColumnValuesConfig | undefined) => ColumnValuesConfig)
  ) => void
  compact?: boolean
  lockedColumnIds?: ReadonlySet<string>
  /** When false, menu still shows layout actions but no facet body. */
  enableFacets?: boolean
}

export function RepaymentColumnFilter({
  column,
  table,
  columnId,
  columnLabel,
  selected,
  onChange,
  allRows,
  getters,
  columnValues,
  onColumnValuesChange,
  compact = true,
  lockedColumnIds,
  enableFacets = true
}: Props) {
  const { users: orgUsers } = useOrgUsers()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [colorizing, setColorizing] = useState(false)

  const sorted = column.getIsSorted()

  const allValues = useMemo(
    () => (enableFacets && open ? collectFilterFacets(columnId, allRows, getters) : []),
    [enableFacets, open, columnId, allRows, getters]
  )

  const displayedValues = useMemo(() => {
    const q = search.trim()
    if (!q) return allValues
    if (columnId === 'gestionnaire') {
      return filterCollaboratorFacetValues(allValues, q, orgUsers)
    }
    const lower = q.toLowerCase()
    return allValues.filter((value) =>
      formatRepaymentFacetLabel(columnId, value).toLowerCase().startsWith(lower)
    )
  }, [allValues, search, columnId, orgUsers])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const hasActiveFilter = selected.length > 0
  const enableColorize =
    enableFacets && isRepaymentColorizableColumn(columnId) && Boolean(onColumnValuesChange)
  const hasExistingStyles = useMemo(
    () => hasColumnValueStyles(columnValues, columnId),
    [columnValues, columnId]
  )
  const colorizeLabel = columnColorizeButtonLabel(hasExistingStyles)
  const showMenuHighlight = hasActiveFilter || Boolean(sorted)

  if (!open && search) setSearch('')

  const toggleValue = (value: string) => {
    const next = selectedSet.has(value) ? selected.filter((v) => v !== value) : [...selected, value]
    onChange(next)
  }

  const handleClear = () => {
    onChange([])
    setOpen(false)
  }

  const handleColorize = async () => {
    if (!enableColorize || !onColumnValuesChange || allValues.length === 0 || colorizing) return
    setColorizing(true)
    try {
      const generated = generateColumnValueStyles(
        allValues.map((value) => formatRepaymentFacetLabel(columnId, value))
      )
      const columnKey = normalizeColumnValueKey(columnId)
      onColumnValuesChange((prev) => ({
        ...prev,
        [columnKey]: generated
      }))
    } finally {
      setColorizing(false)
    }
  }

  const handleDecolorize = () => {
    if (!enableColorize || !onColumnValuesChange || !hasExistingStyles) return
    onColumnValuesChange((prev) => clearColumnValueStyles(prev, columnId))
  }

  const showColorize = enableColorize && allValues.length > 0
  const showValueList = enableFacets && (allValues.length > 0 || search.trim().length > 0)

  let facetBody: ReactNode = null
  if (enableFacets) {
    facetBody = (
      <>
        <DropdownMenuSeparator />
        <div className="px-1.5 py-1">
          <Input
            className="h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            aria-label="Rechercher une valeur"
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
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
          {!showValueList ? (
            <DropdownMenuItem disabled>Aucune valeur</DropdownMenuItem>
          ) : displayedValues.length === 0 ? (
            <DropdownMenuItem disabled>Aucune valeur</DropdownMenuItem>
          ) : (
            displayedValues.map((value) => (
              <DropdownMenuCheckboxItem
                key={value || '__empty__'}
                checked={selectedSet.has(value)}
                onCheckedChange={() => toggleValue(value)}
              >
                {columnId === 'gestionnaire' && value ? (
                  <OrgUserListItem {...resolveOrgUserListFields(value, orgUsers)} />
                ) : (
                  formatRepaymentFacetLabel(columnId, value)
                )}
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
          <DropdownMenuLabel>{columnLabel || 'Options colonne'}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ColumnHeaderLayoutMenuItems
          column={column}
          table={table}
          lockedColumnIds={lockedColumnIds}
        />
        {facetBody}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
