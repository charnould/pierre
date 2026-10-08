import type { CaseFileChronologyAction, CaseFileChronologyPhase } from '@pierre/shared/activities'

import { ActionCombobox } from '@/shared/components/inspector/action-combobox'
import { CaseBucketBadge } from '@/shared/components/inspector/case-bucket-badge'
import { CaseBucketSelect } from '@/shared/components/inspector/case-bucket-form'
import { toLocalIsoDate } from '@/shared/components/ui/date-picker'
import { Input } from '@/shared/components/ui/input'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import { type ChronologyEntry, sortChronology } from '../lib/case-file-chronology'
import { repaymentActionOptions } from '../lib/repayment-action'
import { repaymentBucketOptions } from '../lib/repayment-bucket'
import {
  AddButton,
  bindNullableText,
  DateField,
  formatIsoDate,
  FormSection,
  RemoveButton
} from './form-controls'

export function ChronologySection({
  entries,
  onChange,
  columnValues,
  phaseDisabled = false
}: {
  entries: ChronologyEntry[]
  onChange: (entries: ChronologyEntry[]) => void
  columnValues?: ColumnValuesConfig
  phaseDisabled?: boolean
}) {
  const catalog = repaymentActionOptions().map((option) => option.label)
  const phases = repaymentBucketOptions()
  const rows = sortChronology(entries)
  const updateEntries = (next: ChronologyEntry[]) => onChange(sortChronology(next))
  const updateEntryItem = (key: string, item: ChronologyEntry['item']) => {
    updateEntries(rows.map((entry) => (entry.key === key ? { ...entry, item } : entry)))
  }

  return (
    <FormSection id="chronologie" title="Chronologie">
      <Table className="table-fixed">
        <colgroup>
          <col className="w-col-34" />
          <col className="w-col-22" />
          <col />
          <col className="w-col-8" />
        </colgroup>
        <TableCaption className="sr-only">Chronologie</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Événement</TableHead>
            <TableHead>Réalisation</TableHead>
            <TableHead>Commentaire</TableHead>
            <TableHead className="text-center">
              <span className="sr-only">Retirer</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <span className="text-muted-foreground">Aucun événement renseigné.</span>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((entry) => {
              const item = entry.item
              if (!entry.editable) {
                const phase =
                  item.kind === 'phase' ? phases.find((option) => option.id === item.phase) : null
                return (
                  <TableRow key={entry.key}>
                    <TableCell>
                      {item.kind === 'phase' ? (
                        <CaseBucketBadge
                          bucket={phase ?? { id: item.phase, label: item.phase }}
                          columnValues={columnValues}
                        />
                      ) : (
                        item.action
                      )}
                    </TableCell>
                    <TableCell>{formatIsoDate(item.date_realisation)}</TableCell>
                    <TableCell>{item.commentaire}</TableCell>
                    <TableCell />
                  </TableRow>
                )
              }
              if (item.kind === 'phase') {
                return (
                  <TableRow key={entry.key}>
                    <TableCell>
                      <CaseBucketSelect
                        id={`chronologie_${entry.key}_phase`}
                        ariaLabel="Phase"
                        value={item.phase || null}
                        options={phases}
                        columnValues={columnValues}
                        onValueChange={(phase) =>
                          updateEntryItem(entry.key, { ...item, phase: phase ?? '' })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <DateField
                        id={`chronologie_${entry.key}_date`}
                        label="Date de réalisation"
                        value={item.date_realisation || null}
                        onChange={(date_realisation) =>
                          updateEntryItem(entry.key, {
                            ...item,
                            date_realisation: date_realisation ?? ''
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        id={`chronologie_${entry.key}_commentaire`}
                        aria-label="Commentaire"
                        {...bindNullableText(item.commentaire, (commentaire) =>
                          updateEntryItem(entry.key, { ...item, commentaire })
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <RemoveButton
                        label="Retirer ce changement de phase"
                        onClick={() =>
                          updateEntries(rows.filter((candidate) => candidate.key !== entry.key))
                        }
                      />
                    </TableCell>
                  </TableRow>
                )
              }
              const labels =
                item.action && !catalog.includes(item.action) ? [item.action, ...catalog] : catalog
              return (
                <TableRow key={entry.key}>
                  <TableCell>
                    <ActionCombobox
                      id={`chronologie_${entry.key}_action`}
                      value={item.action}
                      items={labels}
                      onValueChange={(action) => updateEntryItem(entry.key, { ...item, action })}
                    />
                  </TableCell>
                  <TableCell>
                    <DateField
                      id={`chronologie_${entry.key}_date`}
                      label="Date de réalisation"
                      value={item.date_realisation || null}
                      onChange={(date_realisation) =>
                        updateEntryItem(entry.key, {
                          ...item,
                          date_realisation: date_realisation ?? ''
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      id={`chronologie_${entry.key}_commentaire`}
                      aria-label="Commentaire"
                      {...bindNullableText(item.commentaire, (commentaire) =>
                        updateEntryItem(entry.key, { ...item, commentaire })
                      )}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <RemoveButton
                      label={`Retirer ${item.action || 'cette action'}`}
                      onClick={() =>
                        updateEntries(rows.filter((candidate) => candidate.key !== entry.key))
                      }
                    />
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      <div className="ms-2 flex flex-wrap gap-2">
        <AddButton
          id="chronologie_ajouter_action"
          onClick={() => {
            const id = crypto.randomUUID()
            const item: CaseFileChronologyAction = {
              kind: 'action',
              id,
              action: '',
              date_realisation: toLocalIsoDate(new Date()),
              commentaire: null
            }
            updateEntries([...rows, { key: id, origin: Date.now(), editable: true, item }])
          }}
        >
          Ajouter une action
        </AddButton>
        <AddButton
          disabled={phaseDisabled}
          onClick={() => {
            const item: CaseFileChronologyPhase = {
              kind: 'phase',
              phase: '',
              date_realisation: toLocalIsoDate(new Date()),
              commentaire: null
            }
            updateEntries([
              ...rows,
              { key: crypto.randomUUID(), origin: Date.now(), editable: true, item }
            ])
          }}
        >
          Changer la phase
        </AddButton>
      </div>
    </FormSection>
  )
}
