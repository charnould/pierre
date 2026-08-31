import type { ColumnDef } from '@tanstack/react-table'

import type { TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import {
  TICKET_DRAFT_ICON_ENTRIES,
  draftHasFormat,
  draftIconTooltip,
  draftIsAutomation
} from '@/features/tickets/lib/ticket-draft-icons'
import type {
  AnyPierreColumn,
  AnyPierreTable
} from '@/shared/components/table/column-header-options-menu'
import type { PierreTableFeatures } from '@/shared/components/table/table-features'
import { getTicketCell, getTicketId } from '@/shared/lib/ticket-row'
import { resolveTicketColumnLabel, type UiSettings } from '@/shared/lib/ui-settings/schema'
import type { ColumnFilters } from '@/shared/lib/ui-settings/tickets-table'
import { TICKET_TABLE_DRAFT_GROUP_ID } from '@/shared/lib/ui-settings/tickets-table'
import type { TicketRow, TicketsColumnMeta } from '@/shared/types'

import { TicketCellValue } from './TicketCellValue'
import {
  TicketDraftDotCell,
  TicketDraftLetterCell,
  TicketDraftNpirGroup
} from './TicketDraftLetterCell'
import { TicketsColumnHeader } from './TicketsColumnHeader'

const DATA_CELL = 'tabular-nums'

/** SQLite type affinity used to right-align amounts (not identifiers). */
export function isSqlNumericType(type: string): boolean {
  const t = type.toUpperCase()
  return (
    t.includes('INT') ||
    t.includes('REAL') ||
    t.includes('FLOA') ||
    t.includes('DOUB') ||
    t.includes('NUM') ||
    t.includes('DEC')
  )
}

function isTicketsIdColumn(name: string): boolean {
  return name === 'id_reclamation' || name.startsWith('id_')
}

function isTicketsDateColumn(name: string): boolean {
  return name === 'date' || name.startsWith('date_')
}

export function isTicketsNumericColumn(columnId: string, columns: TicketsColumnMeta[]): boolean {
  const column = columns.find((entry) => entry.name === columnId)
  if (!column || isTicketsIdColumn(column.name) || isTicketsDateColumn(column.name)) return false
  return isSqlNumericType(column.type)
}

export type BuildTicketsColumnsOptions = {
  settings?: UiSettings
  columnFilters?: ColumnFilters
  url?: string
  onColumnFiltersChange?: (filters: ColumnFilters) => void
  onDraftIconClick?: (
    id_reclamation: string,
    format: TicketSkillKey,
    hasDraft: boolean,
    draft_id_skills?: string[],
    draft_answer_channel?: string | null
  ) => void
}

function buildDraftColumn(
  onDraftIconClick: NonNullable<BuildTicketsColumnsOptions['onDraftIconClick']>
): ColumnDef<PierreTableFeatures, TicketRow> {
  return {
    id: TICKET_TABLE_DRAFT_GROUP_ID,
    accessorKey: TICKET_TABLE_DRAFT_GROUP_ID,
    enableHiding: false,
    enableSorting: false,
    enableResizing: false,
    size: 120,
    header: () => (
      <TicketDraftNpirGroup>
        {TICKET_DRAFT_ICON_ENTRIES.map(({ format, letter }) => (
          <TicketDraftLetterCell
            key={format}
            letter={letter}
            hasDraft={false}
            disabled
            tooltip={letter}
          />
        ))}
      </TicketDraftNpirGroup>
    ),
    cell: ({ row }) => {
      const id_reclamation = getTicketId(row.original)
      if (!id_reclamation) return null
      const draft_id_skills = row.original.draft_id_skills
      const draft_answer_channel = row.original.draft_answer_channel
      const draft_automation_skills = row.original.draft_automation_skills
      return (
        <TicketDraftNpirGroup onClick={(event) => event.stopPropagation()}>
          {TICKET_DRAFT_ICON_ENTRIES.map(({ format }) => {
            const hasDraft = draftHasFormat(draft_id_skills, format, draft_answer_channel)
            const isAutomation = draftIsAutomation(
              format,
              draft_id_skills,
              draft_answer_channel,
              draft_automation_skills
            )
            return (
              <TicketDraftDotCell
                key={format}
                hasDraft={hasDraft}
                isAutomation={isAutomation}
                tooltip={draftIconTooltip(format, hasDraft)}
                onClick={() =>
                  onDraftIconClick(
                    id_reclamation,
                    format,
                    hasDraft,
                    draft_id_skills,
                    draft_answer_channel
                  )
                }
              />
            )
          })}
        </TicketDraftNpirGroup>
      )
    }
  }
}

export function buildTicketsColumns(
  columns: TicketsColumnMeta[],
  options: BuildTicketsColumnsOptions = {}
): ColumnDef<PierreTableFeatures, TicketRow>[] {
  const dataColumns: ColumnDef<PierreTableFeatures, TicketRow>[] = columns.map(({ name }) => {
    const title = resolveTicketColumnLabel(name, options.settings)
    const numeric = isTicketsNumericColumn(name, columns)
    const date = isTicketsDateColumn(name)
    const tabular = numeric || date || isTicketsIdColumn(name)

    return {
      accessorKey: name,
      id: name,
      enableHiding: true,
      header: ({ column, table }) => (
        <TicketsColumnHeader
          column={column as AnyPierreColumn}
          table={table as AnyPierreTable}
          title={title}
          columnName={name}
          url={options.url}
          columnFilters={options.columnFilters}
          onColumnFiltersChange={options.onColumnFiltersChange}
        />
      ),
      cell: ({ row }) => {
        const value = getTicketCell(row.original, name)
        return (
          <TicketCellValue
            column={name}
            value={value}
            columnValues={options.settings?.tickets?.table?.columnValues}
            className={tabular ? DATA_CELL : undefined}
          />
        )
      }
    }
  })

  if (!options.onDraftIconClick) return dataColumns

  return [buildDraftColumn(options.onDraftIconClick), ...dataColumns]
}
