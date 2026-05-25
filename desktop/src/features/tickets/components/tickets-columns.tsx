import type { ColumnDef } from '@tanstack/react-table'

import type { TicketSkillKey } from '@/features/tickets/lib/knowledge-skills'
import {
  TICKET_DRAFT_ICON_ENTRIES,
  draftHasFormat,
  draftIconTooltip,
  draftIsAutomation
} from '@/features/tickets/lib/ticket-draft-icons'
import { getTicketCell, getTicketId } from '@/shared/lib/ticket-row'
import { resolveTicketColumnLabel, type UiSettings } from '@/shared/lib/ui-settings/schema'
import type { ColumnFilters } from '@/shared/lib/ui-settings/tickets-table'
import {
  COLUMN_WIDTH_MIN,
  TICKET_TABLE_DRAFT_GROUP_ID,
  TICKET_TABLE_DRAFT_GROUP_WIDTH
} from '@/shared/lib/ui-settings/tickets-table'
import type { TicketRow, TicketsColumnMeta } from '@/shared/types'

import { TicketCellValue } from './TicketCellValue'
import {
  TicketDraftDotCell,
  TicketDraftLetterCell,
  TicketDraftNpirGroup
} from './TicketDraftLetterCell'
import { TicketsColumnHeader } from './TicketsColumnHeader'

const CORE_SIZING: Record<string, { size: number; minSize: number }> = {
  id_reclamation: { size: 160, minSize: 140 },
  id_locataire: { size: 140, minSize: 120 },
  id_lot: { size: 180, minSize: 160 }
}

const DRAFT_NPIR_WRAP_CLASS = 'flex h-full min-h-0 w-full min-w-0'

export type BuildTicketsColumnsOptions = {
  settings?: UiSettings
  columnFilters?: ColumnFilters
  url?: string
  enableColumnDnD?: boolean
  onColumnFiltersChange?: (filters: ColumnFilters) => void
  onDraftIconClick?: (
    id_reclamation: string,
    format: TicketSkillKey,
    hasDraft: boolean,
    draft_id_skills?: string[],
    draft_answer_channel?: string | null
  ) => void
}

export function buildDraftColumn(
  onDraftIconClick: NonNullable<BuildTicketsColumnsOptions['onDraftIconClick']>
): ColumnDef<TicketRow> {
  return {
    id: TICKET_TABLE_DRAFT_GROUP_ID,
    accessorKey: TICKET_TABLE_DRAFT_GROUP_ID,
    size: TICKET_TABLE_DRAFT_GROUP_WIDTH,
    minSize: TICKET_TABLE_DRAFT_GROUP_WIDTH,
    maxSize: TICKET_TABLE_DRAFT_GROUP_WIDTH,
    enablePinning: true,
    enableResizing: false,
    enableHiding: false,
    enableSorting: false,
    meta: { compact: true, compactFlush: true },
    header: () => (
      <div className={DRAFT_NPIR_WRAP_CLASS}>
        <TicketDraftNpirGroup className="bg-muted/20">
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
      </div>
    ),
    cell: ({ row }) => {
      const id_reclamation = getTicketId(row.original)
      if (!id_reclamation) return null
      const draft_id_skills = row.original.draft_id_skills
      const draft_answer_channel = row.original.draft_answer_channel
      const draft_automation_skills = row.original.draft_automation_skills
      return (
        <div className={DRAFT_NPIR_WRAP_CLASS} onClick={(e) => e.stopPropagation()}>
          <TicketDraftNpirGroup>
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
        </div>
      )
    }
  }
}

export function buildTicketsColumns(
  columns: TicketsColumnMeta[],
  options: BuildTicketsColumnsOptions = {}
): ColumnDef<TicketRow>[] {
  const dataColumns = columns.map(({ name }) => {
    const sizing = CORE_SIZING[name] ?? { size: 200, minSize: 160 }
    const title = resolveTicketColumnLabel(name, options.settings)

    return {
      accessorKey: name,
      id: name,
      size: sizing.size,
      minSize: COLUMN_WIDTH_MIN,
      enablePinning: true,
      enableResizing: true,
      enableHiding: true,
      header: ({ column }) => (
        <TicketsColumnHeader
          column={column}
          title={title}
          columnName={name}
          url={options.url}
          columnFilters={options.columnFilters}
          onColumnFiltersChange={options.onColumnFiltersChange}
          enableColumnDnD={options.enableColumnDnD}
        />
      ),
      cell: ({ row }) => {
        const value = getTicketCell(row.original, name)
        return (
          <TicketCellValue
            column={name}
            value={value}
            columnValues={options.settings?.tickets?.table?.columnValues}
          />
        )
      }
    }
  })

  if (!options.onDraftIconClick) return dataColumns

  return [buildDraftColumn(options.onDraftIconClick), ...dataColumns]
}

export function buildInitialColumnOrder(columns: TicketsColumnMeta[]): string[] {
  return columns.map((c) => c.name)
}
