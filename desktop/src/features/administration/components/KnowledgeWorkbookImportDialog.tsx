import {
  normalize_knowledge_name,
  type SpreadsheetValidationResult,
  validateSpreadsheetHeaders
} from '@pierre/shared/knowledge'
import { useId, useMemo, useState } from 'react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Spinner } from '@/shared/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table'
import type { KnowledgeSource, WorkbookInspectSheet } from '@/shared/types/knowledge'

export type PendingWorkbookSheetImport = {
  filePath: string
  originalName: string
  sheet: WorkbookInspectSheet
  existingSource: KnowledgeSource | null
  reason?: string
}

export type SheetDraft = {
  headerRow: number
  title: string
}

export type SheetDraftCheck =
  | { kind: 'ok'; validation: Extract<SpreadsheetValidationResult, { ok: true }> }
  | { kind: 'error'; message: string; needsMoreRows?: boolean }

export const detectHeaderRow = (sheet: WorkbookInspectSheet): number | null =>
  sheet.rows.find(
    (row) => validateSpreadsheetHeaders(row.cells, sheet.columnStats, row.rowNumber).ok
  )?.rowNumber ?? null

export const createInitialSheetDraft = (
  sheet: WorkbookInspectSheet,
  existingSource: KnowledgeSource | null
): SheetDraft => {
  if (existingSource) {
    const previousRow = Math.min(existingSource.headerRow ?? 1, sheet.totalRows)
    const previousValid =
      evaluateSheetDraft(sheet, { headerRow: previousRow, title: existingSource.title }).kind ===
      'ok'
    return {
      headerRow: previousValid ? previousRow : (detectHeaderRow(sheet) ?? previousRow),
      title: existingSource.title
    }
  }
  return {
    headerRow: detectHeaderRow(sheet) ?? 1,
    title: sheet.name
  }
}

export const evaluateSheetDraft = (
  sheet: WorkbookInspectSheet,
  draft: SheetDraft
): SheetDraftCheck => {
  if (
    !Number.isInteger(draft.headerRow) ||
    draft.headerRow < 1 ||
    draft.headerRow > sheet.totalRows
  ) {
    return {
      kind: 'error',
      message: `La ligne d’en-tête doit être comprise entre 1 et ${sheet.totalRows}.`
    }
  }
  const row = sheet.rows.find((candidate) => candidate.rowNumber === draft.headerRow)
  if (!row) {
    return {
      kind: 'error',
      needsMoreRows: true,
      message: `Chargez l’aperçu jusqu’à la ligne ${draft.headerRow} pour vérifier les en-têtes.`
    }
  }
  const validation = validateSpreadsheetHeaders(row.cells, sheet.columnStats, draft.headerRow)
  if (!validation.ok) return { kind: 'error', message: validation.message }
  return { kind: 'ok', validation }
}

interface Props {
  url: string
  pending: PendingWorkbookSheetImport
  position: number
  total: number
  onSkip: () => void
  onCancel: () => void
  onImported: (result: { changed: boolean }) => void
}

export function KnowledgeWorkbookImportDialog({
  url,
  pending,
  position,
  total,
  onSkip,
  onCancel,
  onImported
}: Props) {
  const fieldId = useId()
  const [sheet, setSheet] = useState<WorkbookInspectSheet>(pending.sheet)
  const [draft, setDraft] = useState<SheetDraft>(() =>
    createInitialSheetDraft(pending.sheet, pending.existingSource)
  )
  const [loadingMore, setLoadingMore] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const check = useMemo(() => evaluateSheetDraft(sheet, draft), [draft, sheet])
  const canImport = check.kind === 'ok' && !saving
  const nextLoadRows = Math.min(
    sheet.totalRows,
    Math.max(sheet.rows.length + 60, draft.headerRow + 15)
  )
  const tableName = normalize_knowledge_name(draft.title.trim() || sheet.name)

  function updateHeaderRow(headerRow: number) {
    setSubmitError('')
    setDraft((current) => ({ ...current, headerRow }))
  }

  async function loadMoreRows(targetMaxRows: number) {
    setLoadingMore(true)
    setSubmitError('')
    const response = await window.api?.inspectKnowledgeWorkbook({
      url,
      filePath: pending.filePath,
      maxRows: targetMaxRows
    })
    setLoadingMore(false)
    if (!response) {
      setSubmitError('Impossible de joindre le serveur.')
      return
    }
    if ('error' in response) {
      setSubmitError(response.error.message)
      return
    }
    const updated = response.data.sheets.find((candidate) => candidate.name === sheet.name)
    if (updated) setSheet(updated)
  }

  async function submit() {
    if (!canImport) return
    setSaving(true)
    setSubmitError('')
    const response = await window.api?.uploadKnowledgeFiles({
      url,
      filePaths: [pending.filePath],
      sheet: {
        sheetName: sheet.name,
        headerRow: draft.headerRow,
        title: draft.title.trim() || sheet.name
      }
    })
    setSaving(false)
    if (!response) {
      setSubmitError('Impossible de joindre le serveur.')
      return
    }
    if ('error' in response) {
      setSubmitError(response.error.message)
      return
    }
    onImported({ changed: response.data.sources.some((item) => item.changed) })
  }

  const dialogTitle =
    total > 1 ? `Importer ${sheet.name} (${position}/${total})` : `Importer ${sheet.name}`
  const rowCountLabel = `${sheet.totalRows} ${sheet.totalRows > 1 ? 'lignes' : 'ligne'}`

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <DialogContent viewport="form" className="overflow-y-auto sm:max-w-2xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {pending.reason ??
              `${pending.originalName} · ${rowCountLabel}. Choisissez la ligne d’en-tête.`}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <FieldSet>
            <FieldLegend>Structure du tableau</FieldLegend>
            <Field data-invalid={check.kind === 'error' ? true : undefined}>
              <FieldLabel htmlFor={`${fieldId}-header-row`}>Ligne d’en-tête</FieldLabel>
              <Input
                id={`${fieldId}-header-row`}
                type="number"
                min={1}
                max={sheet.totalRows}
                value={draft.headerRow > 0 ? draft.headerRow : ''}
                aria-invalid={check.kind === 'error' ? true : undefined}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10)
                  updateHeaderRow(Number.isNaN(parsed) ? 0 : parsed)
                }}
              />
            </Field>

            {check.kind === 'ok' ? (
              <FieldDescription>
                {check.validation.columns.length}{' '}
                {check.validation.columns.length > 1 ? 'colonnes reconnues' : 'colonne reconnue'} :{' '}
                {check.validation.columns.map((col) => `${col.colLetter} (${col.name})`).join(', ')}
              </FieldDescription>
            ) : (
              <FieldError>{check.message}</FieldError>
            )}

            <div className="max-h-56 min-w-0 overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ligne</TableHead>
                    {sheet.columnStats.map((col) => (
                      <TableHead key={col.colLetter}>{col.colLetter}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sheet.rows.map((row) => {
                    const isHeader = row.rowNumber === draft.headerRow
                    const isDataStart = row.rowNumber === draft.headerRow + 1
                    return (
                      <TableRow
                        key={row.rowNumber}
                        data-state={isHeader ? 'selected' : undefined}
                        onClick={() => updateHeaderRow(row.rowNumber)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="text-muted-foreground tabular-nums">
                              {row.rowNumber}
                            </span>
                            {isHeader ? (
                              <Badge variant="default">En-tête</Badge>
                            ) : isDataStart ? (
                              <Badge variant="secondary">Données</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        {sheet.columnStats.map((col) => {
                          const text = row.cells[col.colIndex]?.value ?? ''
                          return (
                            <TableCell key={col.colLetter}>
                              <span className="block max-w-44 truncate" title={text || undefined}>
                                {text}
                              </span>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {sheet.rows.length < sheet.totalRows ? (
              <div className="flex items-center justify-between gap-2">
                <FieldDescription>
                  Aperçu des lignes 1 à {sheet.rows.length} sur {sheet.totalRows} (après défusion
                  automatique).
                </FieldDescription>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingMore}
                  onClick={() => void loadMoreRows(nextLoadRows)}
                >
                  {loadingMore ? <Spinner /> : null}
                  Charger jusqu’à la ligne {nextLoadRows}
                </Button>
              </div>
            ) : (
              <FieldDescription>Aperçu complet après défusion automatique.</FieldDescription>
            )}
          </FieldSet>

          <FieldSet>
            <FieldLegend>Contenu</FieldLegend>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${fieldId}-title`}>Titre dans l’encyclopédie</FieldLabel>
                <Input
                  id={`${fieldId}-title`}
                  value={draft.title}
                  placeholder={sheet.name}
                  onChange={(event) => {
                    setSubmitError('')
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }}
                />
                <FieldDescription>
                  Nom sous lequel les assistants citent cette source.
                  {tableName ? ` Table pour l’agent : ${tableName}.` : null}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>

          {submitError ? <FieldError>{submitError}</FieldError> : null}
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={onSkip}>
            Ignorer
          </Button>
          <Button type="button" disabled={!canImport} onClick={() => void submit()}>
            {saving ? <Spinner /> : null}
            Importer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
