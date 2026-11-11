import {
  type CommonData,
  readRepaymentCaseFile,
  refreshCaseFile,
  type RepaymentCaseFile,
  repaymentCaseFileContent,
  type Schedule,
  type SocialFinancialDiagnosis
} from '@pierre/shared/repayment-case-file'
import {
  documentChronologyRows,
  type MissingDocumentField,
  missingRepaymentDocumentFields
} from '@pierre/shared/repayment-document-fields'
import { defaultPhase } from '@pierre/shared/repayment-phases'
import { ArrowLeft, ArrowUpRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { FieldGroup } from '@/shared/components/ui/field'
import { toast } from '@/shared/components/ui/toast'
import { repaymentSetup } from '@/shared/lib/instance-customization'
import type { ColumnValuesConfig } from '@/shared/lib/ui-settings/tickets-table'

import {
  type ChronologyEntry,
  prepareChronologyPayload,
  sortChronology
} from '../lib/case-file-chronology'
import type { TenantRepaymentRow } from '../lib/classify-tenants'
import { isDepartedTenantRow } from '../lib/repayment-bucket'
import { invalidateRepaymentTimelineCache } from '../lib/repayment-timeline-cache'
import { BudgetSection } from './budget-section'
import { ChronologySection } from './chronology-section'
import { DiagnosisSection } from './diagnosis-section'
import { FormSection } from './form-controls'
import { HouseholdSection } from './household-section'
import { IdentificationSection } from './identification-section'
import { LeaseAccountSection } from './lease-account-section'
import { normalizeCaseFile } from './normalize-case-file'
import {
  applyScheduleChange,
  createInitialSchedule,
  rebalanceScheduleIfDebtChanged
} from './schedule-edits'
import { ScheduleSection } from './schedule-section'
import { caseFileFromTenant, tenantFromCaseFile } from './tenant-case-file'

import './case-file.css'

const EXPORT_DOCUMENTS = [
  { id: 'diagnostic', label: 'Diagnostic' },
  { id: 'plan', label: 'Plan d’apurement' },
  { id: 'protocole', label: 'Protocole de cohésion sociale' }
] as const

type SaveState = 'pristine' | 'dirty' | 'saved'

export type CaseFileSavedPayload = {
  tenant: TenantRepaymentRow
  activityId: number
  composeMode?: 'note'
}

interface Props {
  url?: string
  tenant: TenantRepaymentRow
  initialCaseFile?: RepaymentCaseFile
  initialChronology?: ChronologyEntry[]
  columnValues?: ColumnValuesConfig
  existingActivityId?: number
  onClose: () => void
  onSaved?: (payload: CaseFileSavedPayload) => void
}

export function CaseFileScreen({
  url,
  tenant,
  initialCaseFile,
  initialChronology = [],
  columnValues,
  existingActivityId,
  onClose,
  onSaved
}: Props) {
  const [caseFile, setCaseFile] = useState<RepaymentCaseFile>(() =>
    refreshCaseFile(initialCaseFile ?? caseFileFromTenant(tenant))
  )
  const [scheduleDraft, setScheduleDraft] = useState<Schedule | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('pristine')
  const [saving, setSaving] = useState(false)
  const [chronology, setChronology] = useState(initialChronology)
  const [openAdultDetail, setOpenAdultDetail] = useState<number | null>(null)
  const [inspectedDocument, setInspectedDocument] = useState<
    (typeof EXPORT_DOCUMENTS)[number]['id'] | null
  >(null)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const common = caseFile.donnees_communes
  const documentTags = repaymentSetup().documentTags
  const stage = defaultPhase(repaymentSetup().phases)
  const chronologyRows = documentChronologyRows(sortChronology(chronology))
  const missingFor = (kind: (typeof EXPORT_DOCUMENTS)[number]['id']) => {
    const tags = documentTags[kind]
    return tags ? missingRepaymentDocumentFields(tags, caseFile, chronologyRows, stage) : []
  }
  const inspectedMissing = inspectedDocument ? missingFor(inspectedDocument) : []
  const missingSignature = inspectedDocument
    ? inspectedMissing
        .map((field) => `${field.targetId}:${field.adultPopoverIndex ?? ''}`)
        .join('|')
    : ''

  useEffect(() => {
    if (!inspectedDocument || inspectedMissing.length === 0) return
    document.getElementById('champs-manquants')?.scrollIntoView({ block: 'nearest' })
  }, [inspectedDocument, inspectedMissing.length])

  useEffect(() => {
    if (!missingSignature) return
    const targets = missingSignature.split('|').map((entry) => {
      const sep = entry.lastIndexOf(':')
      const targetId = sep < 0 ? entry : entry.slice(0, sep)
      const popover = sep < 0 ? '' : entry.slice(sep + 1)
      return {
        targetId,
        adultPopoverIndex: popover === '' ? undefined : Number(popover)
      }
    })
    let cleanup = syncInvalidControls(document, targets)
    const frame =
      openAdultDetail == null
        ? 0
        : requestAnimationFrame(() => {
            cleanup()
            cleanup = syncInvalidControls(document, targets)
          })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      cleanup()
    }
  }, [missingSignature, openAdultDetail])

  useEffect(() => {
    if (!focusTarget) return
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const node = document.getElementById(focusTarget) ?? document.getElementById('chronologie')
        node?.scrollIntoView({ block: 'center' })
        if (node instanceof HTMLElement) node.focus({ preventScroll: true })
        setFocusTarget(null)
      })
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [focusTarget, openAdultDetail])

  const jumpToField = (field: MissingDocumentField) => {
    setOpenAdultDetail(field.adultPopoverIndex ?? null)
    setFocusTarget(field.targetId)
  }

  const patchCommon = (patch: Partial<CommonData>) => {
    setSaveState('dirty')
    const before = common
    const nextCommon = { ...before, ...patch }
    setScheduleDraft((draft) => rebalanceScheduleIfDebtChanged(before, nextCommon, draft))
    setCaseFile((current) => {
      const currentCommon = { ...current.donnees_communes, ...patch }
      return refreshCaseFile({
        ...current,
        donnees_communes: currentCommon,
        echeancier: rebalanceScheduleIfDebtChanged(
          current.donnees_communes,
          currentCommon,
          current.echeancier
        )
      })
    })
  }

  const patchDiagnosis = (diagnosis: SocialFinancialDiagnosis) => {
    setSaveState('dirty')
    setCaseFile({ ...caseFile, diagnostic_social_financier: diagnosis })
  }

  const handleScheduleChange = (next: Schedule) => {
    setSaveState('dirty')
    setScheduleDraft(next)
    setCaseFile((current) =>
      refreshCaseFile({
        ...current,
        echeancier: applyScheduleChange(
          current.donnees_communes,
          current.echeancier ?? next,
          next,
          new Date()
        )
      })
    )
  }

  const handleScheduleIncludedChange = (included: boolean) => {
    setSaveState('dirty')
    if (!included) {
      setScheduleDraft(caseFile.echeancier)
      setCaseFile({ ...caseFile, echeancier: null })
      return
    }
    const restored =
      scheduleDraft ??
      caseFile.echeancier ??
      createInitialSchedule(common, repaymentSetup().schedule.defaultInstallments, new Date())
    setCaseFile(refreshCaseFile({ ...caseFile, echeancier: restored }))
  }

  const handleChronologyChange = (entries: ChronologyEntry[]) => {
    setSaveState('dirty')
    setChronology(entries)
  }

  const freezeEditablePhases = () => {
    setChronology((current) =>
      current.map((entry) =>
        entry.editable && entry.item.kind === 'phase' ? { ...entry, editable: false } : entry
      )
    )
  }

  const validateCaseFile = (): RepaymentCaseFile | null => {
    const readable = readRepaymentCaseFile(normalizeCaseFile(caseFile))
    if (!readable.ok) {
      toast.add({ title: readable.error, type: 'error' })
      return null
    }
    return readable.value
  }

  const save = async (options?: { discuss?: boolean }, prepared?: RepaymentCaseFile) => {
    const validated = prepared ?? validateCaseFile()
    if (!validated) return
    const clientId = validated.donnees_communes.identification.id_client
    const tenantId = validated.donnees_communes.identification.id_locataire
    if (!clientId) {
      toast.add({ title: 'Indiquez l’identifiant client', type: 'error' })
      return
    }
    if (!tenantId) {
      toast.add({ title: 'Indiquez l’identifiant locataire', type: 'error' })
      return
    }
    const chronologyPayload = prepareChronologyPayload(chronology)
    if (!chronologyPayload.ok) {
      toast.add({ title: 'Complétez chaque événement de la chronologie', type: 'error' })
      return
    }
    const content = repaymentCaseFileContent(validated)
    if (!url) {
      toast.add({ title: 'Plan prêt (aperçu local)', type: 'success' })
      freezeEditablePhases()
      setSaveState('saved')
      return
    }
    setSaving(true)
    try {
      let activityId = existingActivityId
      if (existingActivityId) {
        const response = await window.api?.patchActivity({
          url,
          id: existingActivityId,
          patch: {
            operation: 'save_repayment_plan',
            contenu: content,
            chronologie: chronologyPayload.items
          }
        })
        activityId = response?.data?.id ?? existingActivityId
        if (!response?.data?.id) {
          toast.add({ title: "Le plan n'a pas pu être enregistré", type: 'error' })
          return
        }
      } else {
        const response = await window.api?.createActivity({
          url,
          contexte: 'repayment',
          ref: tenantId,
          type: 'repayment_plan.created',
          contenu: content,
          chronologie: chronologyPayload.items
        })
        activityId = response?.data?.id
        if (!activityId) {
          toast.add({ title: "Le plan n'a pas pu être enregistré", type: 'error' })
          return
        }
      }
      invalidateRepaymentTimelineCache(
        url,
        validated.donnees_communes.identification.id_client ?? tenant.id_client,
        tenantId
      )
      toast.add({ title: 'Plan enregistré', type: 'success' })
      freezeEditablePhases()
      setSaveState('saved')
      if (activityId) {
        onSaved?.({
          tenant: tenantFromCaseFile(validated),
          activityId,
          ...(options?.discuss ? { composeMode: 'note' as const } : {})
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const discuss = async () => {
    const validated = validateCaseFile()
    if (!validated) return
    if (
      existingActivityId &&
      (saveState === 'pristine' || saveState === 'saved') &&
      validated.donnees_communes.identification.id_locataire
    ) {
      onSaved?.({
        tenant: tenantFromCaseFile(validated),
        activityId: existingActivityId,
        composeMode: 'note'
      })
      return
    }
    await save({ discuss: true }, validated)
  }

  const exportDocument = async (
    kind: (typeof EXPORT_DOCUMENTS)[number]['id'],
    format: 'docx' | 'pdf'
  ) => {
    if (!url || !window.api?.exportRepaymentDocument) {
      toast.add({ title: 'Export impossible', type: 'error' })
      return
    }
    const validated = validateCaseFile()
    if (!validated) return
    const missing = missingFor(kind)
    if (missing.length > 0) {
      setInspectedDocument(kind)
      return
    }
    const result = await window.api.exportRepaymentDocument({
      url,
      document: kind,
      format,
      dossier: validated,
      chronologie: chronologyRows
    })
    if (result && 'canceled' in result) return
    if (!result || !('saved' in result)) {
      toast.add({
        title:
          result && 'error' in result
            ? (result.error?.message ?? 'Export impossible')
            : 'Export impossible',
        type: 'error'
      })
    }
  }

  return (
    <main className="bg-background min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-document mx-auto flex w-full flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Retour"
          onClick={onClose}
        >
          <ArrowLeft />
        </Button>
        <IdentificationSection
          common={common}
          tenantIdLocked={Boolean(existingActivityId || tenant.id_locataire)}
          onCommonChange={patchCommon}
        />
        <HouseholdSection
          household={common.foyer}
          openDetailIndex={openAdultDetail}
          onOpenDetailIndexChange={setOpenAdultDetail}
          onChange={(foyer) => patchCommon({ foyer })}
        />
        <LeaseAccountSection common={common} onCommonChange={patchCommon} />
        <BudgetSection
          household={common.foyer}
          budget={common.budget}
          onChange={(patch) => patchCommon({ budget: { ...common.budget, ...patch } })}
        />
        <DiagnosisSection
          common={common}
          onCommonChange={patchCommon}
          diagnosis={caseFile.diagnostic_social_financier}
          onDiagnosisChange={patchDiagnosis}
        />
        <ChronologySection
          entries={chronology}
          columnValues={columnValues}
          phaseDisabled={isDepartedTenantRow(tenant)}
          onChange={handleChronologyChange}
        />
        <ScheduleSection
          schedule={caseFile.echeancier}
          onScheduleChange={handleScheduleChange}
          onIncludedChange={handleScheduleIncludedChange}
          assessment={caseFile.diagnostic_social_financier}
          onAssessmentChange={(assessment) =>
            patchDiagnosis({ ...caseFile.diagnostic_social_financier, ...assessment })
          }
        />
        {inspectedDocument && inspectedMissing.length > 0 ? (
          <MissingFieldsSection
            documentLabel={
              EXPORT_DOCUMENTS.find((document) => document.id === inspectedDocument)?.label ?? ''
            }
            fields={inspectedMissing}
            onClose={() => setInspectedDocument(null)}
            onJump={jumpToField}
          />
        ) : null}
        <footer className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => void save()}>
              Enregistrer
            </Button>
            <p className="text-muted-foreground text-xs leading-4" aria-live="polite">
              {saveState === 'pristine'
                ? 'Aucune modification'
                : saveState === 'dirty'
                  ? 'Modifications à enregistrer'
                  : 'Version enregistrée'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void discuss()}
            >
              Discuter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
                Exporter
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-max">
                <DropdownMenuGroup>
                  {EXPORT_DOCUMENTS.map((document) => {
                    const missing = missingFor(document.id)
                    if (documentTags[document.id] && missing.length > 0) {
                      return (
                        <DropdownMenuItem
                          key={document.id}
                          className="justify-between"
                          onClick={() => setInspectedDocument(document.id)}
                        >
                          {document.label}
                          <span className="text-destructive tabular-nums">
                            {missing.length} à compléter
                          </span>
                        </DropdownMenuItem>
                      )
                    }
                    return (
                      <DropdownMenuSub key={document.id}>
                        <DropdownMenuSubTrigger>{document.label}</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuGroup>
                            <DropdownMenuItem
                              onClick={() => void exportDocument(document.id, 'docx')}
                            >
                              Word
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void exportDocument(document.id, 'pdf')}
                            >
                              PDF
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )
                  })}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" />}>
                Faire signer
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-max">
                <DropdownMenuGroup>
                  {EXPORT_DOCUMENTS.map((document) => (
                    <DropdownMenuItem key={document.id}>{document.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </footer>
      </div>
    </main>
  )
}

export function MissingFieldsSection({
  documentLabel,
  fields,
  onClose,
  onJump
}: {
  documentLabel: string
  fields: readonly MissingDocumentField[]
  onClose: () => void
  onJump: (field: MissingDocumentField) => void
}) {
  const groups = groupMissingFields(fields)
  return (
    <FormSection
      invalid
      id="champs-manquants"
      title={`À compléter — ${documentLabel}`}
      action={
        <div className="flex items-center gap-2">
          <Badge variant="destructive">{fields.length} à compléter</Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Masquer les champs à compléter"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
      }
    >
      <FieldGroup>
        {groups.map(([section, items], index) => {
          const headingId = `champs-manquants-section-${index}`
          return (
            <div
              key={section}
              role="group"
              aria-labelledby={headingId}
              className="flex flex-col gap-2"
            >
              <span id={headingId} className="text-muted-foreground text-xs leading-4 font-medium">
                {section}
              </span>
              <div className="flex flex-wrap gap-2">
                {items.map((field) => (
                  <Button
                    key={field.targetId}
                    variant="outline"
                    nativeButton={false}
                    className="w-fit"
                    render={
                      <a
                        href={`#${field.targetId}`}
                        onClick={(event) => {
                          event.preventDefault()
                          onJump(field)
                        }}
                      />
                    }
                  >
                    {field.label}
                    <ArrowUpRight data-icon="inline-end" className="text-muted-foreground" />
                  </Button>
                ))}
              </div>
            </div>
          )
        })}
      </FieldGroup>
    </FormSection>
  )
}

function groupMissingFields(
  fields: readonly MissingDocumentField[]
): [string, MissingDocumentField[]][] {
  const groups = new Map<string, MissingDocumentField[]>()
  for (const field of fields) {
    const bucket = groups.get(field.section)
    if (bucket) bucket.push(field)
    else groups.set(field.section, [field])
  }
  return [...groups.entries()]
}

export function syncInvalidControls(
  doc: Pick<Document, 'getElementById'>,
  fields: readonly Pick<MissingDocumentField, 'targetId' | 'adultPopoverIndex'>[]
): () => void {
  const marked: HTMLElement[] = []
  for (const field of fields) {
    const target =
      doc.getElementById(field.targetId) ??
      (field.adultPopoverIndex != null
        ? doc.getElementById(`adult_${field.adultPopoverIndex}_details`)
        : null)
    if (
      !target ||
      target.tagName === 'H2' ||
      target.tagName === 'SECTION' ||
      target.getAttribute('aria-invalid') === 'true'
    ) {
      continue
    }
    target.setAttribute('aria-invalid', 'true')
    marked.push(target)
  }
  return () => {
    for (const element of marked) element.removeAttribute('aria-invalid')
  }
}
