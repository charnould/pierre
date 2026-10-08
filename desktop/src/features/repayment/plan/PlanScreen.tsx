import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'

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
import { toast } from '@/shared/components/ui/toast'
import { repaymentSetup } from '@/shared/lib/instance-customization'

import {
  amountToSettle,
  blankInstallment,
  type CommonData,
  readRepaymentForms,
  refreshForms,
  type RepaymentForms,
  type Schedule as ScheduleValue
} from '../../../../../shared/repayment-plan'
import type { TenantRepaymentRow } from '../lib/classify-tenants'
import { invalidateRepaymentTimelineCache } from '../lib/repayment-timeline-cache'
import { caseFromTenant, planLocataireRef } from './case-from-tenant'
import { normalize } from './document'
import { applyInstallmentEdit, installmentAmounts } from './schedule-metrics'
import { Account } from './sections/account'
import { Budget } from './sections/budget'
import { Diagnosis } from './sections/diagnosis'
import { Household } from './sections/household'
import { Identification } from './sections/identification'
import { Lease } from './sections/lease'
import { Schedule } from './sections/schedule'
import { Settlement } from './sections/settlement'
import { Support } from './sections/support'

import './plan.css'

const EXPORTS = [
  { id: 'diagnostic', label: 'Diagnostic' },
  { id: 'plan', label: 'Plan d’apurement' },
  { id: 'protocole', label: 'Protocole de cohésion sociale' }
] as const
type SaveState = 'pristine' | 'dirty' | 'saved'

export type PlanSavedPayload = {
  id_locataire: string
  activityId: number
}

interface Props {
  url?: string
  tenant: TenantRepaymentRow
  initialDossier?: RepaymentForms
  existingActivityId?: number
  onClose: () => void
  onSaved?: (payload: PlanSavedPayload) => void
}

export function PlanScreen({
  url,
  tenant,
  initialDossier,
  existingActivityId,
  onClose,
  onSaved
}: Props) {
  const [forms, setForms] = useState<RepaymentForms>(() => {
    const next = initialDossier ?? caseFromTenant(tenant)
    if (existingActivityId || next.echeancier.echeances.length > 0) return refreshForms(next)
    const count = repaymentSetup().schedule.defaultInstallments
    return refreshForms({
      ...next,
      echeancier: {
        ...next.echeancier,
        echeances: applyInstallmentEdit(
          amountToSettle(next.donnees_communes, next.echeancier),
          [],
          Array.from({ length: count }, () => blankInstallment()),
          new Date()
        )
      }
    })
  })
  const [saveState, setSaveState] = useState<SaveState>('pristine')
  const [saving, setSaving] = useState(false)

  const change = (next: RepaymentForms) => {
    setSaveState('dirty')
    setForms(next)
  }

  const updateCommon = (common: CommonData) => {
    setSaveState('dirty')
    setForms((current) =>
      refreshForms({
        ...current,
        donnees_communes: common,
        echeancier: amountsIfDebtChanged(current.donnees_communes, common, current.echeancier)
      })
    )
  }

  const updateSchedule = (next: ScheduleValue) => {
    setSaveState('dirty')
    setForms((current) =>
      refreshForms({
        ...current,
        echeancier: scheduleChanged(current.donnees_communes, current.echeancier, next)
      })
    )
  }

  const save = async () => {
    const saved = normalize(forms)
    const readable = readRepaymentForms(saved)
    if (!readable.ok) {
      toast.add({ title: readable.error, type: 'error' })
      return
    }
    const idLocataire = planLocataireRef(saved)
    if (!idLocataire) {
      toast.add({ title: 'Indiquez l’identifiant locataire', type: 'error' })
      return
    }
    const contenu = JSON.stringify(readable.value)
    if (!url) {
      toast.add({ title: 'Plan prêt (aperçu local)', type: 'success' })
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
          patch: { operation: 'save_repayment_plan', contenu }
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
          ref: idLocataire,
          type: 'repayment_plan.created',
          contenu
        })
        activityId = response?.data?.id
        if (!activityId) {
          toast.add({ title: "Le plan n'a pas pu être enregistré", type: 'error' })
          return
        }
      }
      invalidateRepaymentTimelineCache(
        url,
        saved.donnees_communes.identification.id_client ?? tenant.id_client,
        idLocataire
      )
      toast.add({ title: 'Plan enregistré', type: 'success' })
      setSaveState('saved')
      if (activityId) onSaved?.({ id_locataire: idLocataire, activityId })
    } finally {
      setSaving(false)
    }
  }

  const download = async (kind: (typeof EXPORTS)[number]['id'], format: 'docx' | 'pdf') => {
    if (!url || !window.api?.exportRepaymentDocument) {
      toast.add({ title: 'Export impossible', type: 'error' })
      return
    }
    const saved = normalize(forms)
    const readable = readRepaymentForms(saved)
    if (!readable.ok) {
      toast.add({ title: readable.error, type: 'error' })
      return
    }
    const result = await window.api.exportRepaymentDocument({
      url,
      document: kind,
      format,
      dossier: readable.value
    })
    if (!result || !('bytes' in result)) {
      toast.add({
        title:
          result && 'error' in result
            ? (result.error?.message ?? 'Export impossible')
            : 'Export impossible',
        type: 'error'
      })
      return
    }
    const link = window.document.createElement('a')
    link.href = URL.createObjectURL(new Blob([result.bytes], { type: result.mimeType }))
    link.download = result.filename
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const common = forms.donnees_communes

  return (
    <div className="bg-background flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <main className="bg-background min-h-full px-4 py-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Retour"
              onClick={onClose}
            >
              <ArrowLeft />
            </Button>
            <Identification value={common} onChange={updateCommon} />
            <Lease value={common} onChange={updateCommon} />
            <Household value={common} onChange={updateCommon} />
            <Account value={common} onChange={updateCommon} />
            <Budget value={common} onChange={updateCommon} />
            <Support value={common} onChange={updateCommon} />
            <Diagnosis
              value={forms.diagnostic_social_financier}
              onChange={(diagnostic_social_financier) =>
                change({ ...forms, diagnostic_social_financier })
              }
            />
            <Settlement
              value={forms.plan_apurement}
              onChange={(plan_apurement) => change({ ...forms, plan_apurement })}
            />
            <Schedule
              id="echeancier"
              title="Échéancier"
              value={forms.echeancier}
              onChange={updateSchedule}
            />
            <footer className="mt-2 flex items-center justify-between gap-2 py-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void save()}
                >
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
                <Button type="button" variant="outline">
                  Discuter
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
                    Exporter
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-max">
                    <DropdownMenuGroup>
                      {EXPORTS.map((document) => (
                        <DropdownMenuSub key={document.id}>
                          <DropdownMenuSubTrigger>{document.label}</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => void download(document.id, 'docx')}>
                                Word
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void download(document.id, 'pdf')}>
                                PDF
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button type="button" />}>
                    Faire signer
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-max">
                    <DropdownMenuGroup>
                      {EXPORTS.map((document) => (
                        <DropdownMenuItem key={document.id}>{document.label}</DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

function amountsIfDebtChanged(
  before: CommonData,
  after: CommonData,
  schedule: ScheduleValue
): ScheduleValue {
  if (amountToSettle(before, schedule) === amountToSettle(after, schedule)) return schedule
  const amounts = installmentAmounts(amountToSettle(after, schedule), schedule.echeances.length)
  return {
    ...schedule,
    echeances: schedule.echeances.map((row, index) => ({
      ...row,
      montant_en_euros: amounts[index] ?? null
    }))
  }
}

function scheduleChanged(
  common: CommonData,
  previous: ScheduleValue,
  next: ScheduleValue
): ScheduleValue {
  const flagsChanged =
    next.traitement_montant_conteste !== previous.traitement_montant_conteste ||
    next.inclure_ancienne_dette_locative !== previous.inclure_ancienne_dette_locative
  if (!flagsChanged) {
    return {
      ...next,
      echeances: applyInstallmentEdit(
        amountToSettle(common, next),
        previous.echeances,
        next.echeances,
        new Date()
      )
    }
  }
  const amounts = installmentAmounts(amountToSettle(common, next), next.echeances.length)
  return {
    ...next,
    echeances: next.echeances.map((row, index) => ({
      ...row,
      montant_en_euros: amounts[index] ?? null
    }))
  }
}
