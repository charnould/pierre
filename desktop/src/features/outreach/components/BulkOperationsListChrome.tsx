import { ChevronDown, Plus, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import {
  BULK_OPERATION_SORT_OPTIONS,
  type BulkOperationSortKey
} from '@/features/outreach/lib/sort-bulk-operations'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from '@/shared/components/ui/input-group'
import { cn } from '@/shared/lib/utils'

interface Props {
  visibleCount: number
  query: string
  onQueryChange: (query: string) => void
  sortKey: BulkOperationSortKey
  onSortKeyChange: (key: BulkOperationSortKey) => void
  onNew: () => void
}

const titleType = 'font-sans text-xl leading-6 font-semibold tracking-tight text-balance'
const metaType =
  'shrink-0 font-sans text-xl leading-6 font-medium tracking-tight text-muted-foreground'

export function BulkOperationsListChrome({
  visibleCount,
  query,
  onQueryChange,
  sortKey,
  onSortKeyChange,
  onNew
}: Props) {
  const normalizedQuery = query.trim()
  const [searchOpen, setSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const showSearch = searchOpen || normalizedQuery.length > 0
  const activeSortLabel =
    BULK_OPERATION_SORT_OPTIONS.find((option) => option.value === sortKey)?.label ?? sortKey
  const countLabel = `${visibleCount} traitement${visibleCount === 1 ? '' : 's'}`

  useEffect(() => {
    if (!showSearch) return
    searchInputRef.current?.focus()
  }, [showSearch])

  function collapseSearchIfEmpty() {
    if (normalizedQuery.length > 0) return
    setSearchOpen(false)
  }

  return (
    <header className="border-border bg-background sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-b py-2 ps-4 pe-2">
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <h2 className={cn('m-0', titleType)}>Traitements de masse</h2>
        <span className={metaType} aria-hidden>
          ·
        </span>
        <span className={cn(metaType, 'tabular-nums')}>{countLabel}</span>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
        {showSearch ? (
          <div className="w-52">
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onBlur={collapseSearchIfEmpty}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') return
                  onQueryChange('')
                  setSearchOpen(false)
                }}
                placeholder="Rechercher…"
                aria-label="Rechercher un traitement"
              />
              {normalizedQuery ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Effacer la recherche"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onQueryChange('')
                      searchInputRef.current?.focus()
                    }}
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Rechercher un traitement"
            onClick={() => setSearchOpen(true)}
          >
            <Search />
          </Button>
        )}

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
            <span className="text-muted-foreground font-normal">Trier par</span>
            <span className="max-w-44 truncate">{activeSortLabel}</span>
            <ChevronDown data-icon="inline-end" className="text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={sortKey}
              onValueChange={(value) => onSortKeyChange(value as BulkOperationSortKey)}
            >
              {BULK_OPERATION_SORT_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button type="button" onClick={onNew}>
          <Plus data-icon="inline-start" />
          Créer
        </Button>
      </div>
    </header>
  )
}
