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

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import { invalidateRepaymentTimelineCache } from '../lib/repayment-timeline-cache'
import { caseFromTenant, planLocataireRef } from './case-from-tenant'
import { type CaseFile, normalize } from './document'
import { applyInstallmentEdit, installmentAmounts } from './schedule-metrics'
import { Budget } from './sections/budget'
import { Debt } from './sections/debt'
import { Household } from './sections/household'
import { Identification } from './sections/identification'
import { Lease } from './sections/lease'
import { Procedure } from './sections/procedure'
import { Schedule } from './sections/schedule'
import { Support } from './sections/support'

import './plan.css'

const DOCUMENTS = ['Diagnostic', 'Plan d’apurement', 'Protocole de cohésion sociale']
type SaveState = 'pristine' | 'dirty' | 'saved'

export type PlanSavedPayload = {
  id_locataire: string
  activityId: number
}

interface Props {
  url?: string
  tenant: TenantRepaymentRow
  initialDossier?: CaseFile
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
  const [dossier, setDossier] = useState<CaseFile>(() => {
    const next = initialDossier ?? caseFromTenant(tenant)
    if (existingActivityId || next.echeancier.echeances.length > 0) return next
    const count = repaymentSetup().create_plan.schedule.defaultMonths
    const blank = { date_echeance: null, mensualite_euros: null }
    return {
      ...next,
      echeancier: {
        ...next.echeancier,
        echeances: applyInstallmentEdit(
          next.dette.montant_restant_du_euros,
          [],
          Array.from({ length: count }, () => ({ ...blank })),
          new Date()
        )
      }
    }
  })
  const [saveState, setSaveState] = useState<SaveState>('pristine')
  const [saving, setSaving] = useState(false)

  const update =
    <K extends keyof CaseFile>(key: K) =>
    (value: CaseFile[K]) => {
      setSaveState('dirty')
      setDossier((current) => ({ ...current, [key]: value }))
    }

  const updateDebt = (dette: CaseFile['dette']) => {
    setSaveState('dirty')
    setDossier((current) => {
      const amounts = installmentAmounts(
        dette.montant_restant_du_euros,
        current.echeancier.echeances.length
      )
      return {
        ...current,
        dette,
        echeancier: {
          ...current.echeancier,
          echeances: current.echeancier.echeances.map((row, index) => ({
            ...row,
            mensualite_euros: amounts[index] ?? null
          }))
        }
      }
    })
  }

  const updateSchedule = (echeancier: CaseFile['echeancier']) => {
    setSaveState('dirty')
    setDossier((current) => ({
      ...current,
      echeancier: {
        ...echeancier,
        echeances: applyInstallmentEdit(
          current.dette.montant_restant_du_euros,
          current.echeancier.echeances,
          echeancier.echeances,
          new Date()
        )
      }
    }))
  }

  const save = async () => {
    const saved = normalize(dossier)
    const idLocataire = planLocataireRef(saved)
    if (!idLocataire) {
      toast.add({ title: 'Indiquez l’identifiant locataire', type: 'error' })
      return
    }
    const contenu = JSON.stringify(saved)
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
        saved.identification.identifiant_client ?? tenant.id_client,
        idLocataire
      )
      toast.add({ title: 'Plan enregistré', type: 'success' })
      setSaveState('saved')
      if (activityId) onSaved?.({ id_locataire: idLocataire, activityId })
    } finally {
      setSaving(false)
    }
  }

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
            <Identification value={dossier.identification} onChange={update('identification')} />
            <Debt value={dossier.dette} onChange={updateDebt} />
            <Procedure value={dossier.procedure} onChange={update('procedure')} />
            <Support value={dossier.accompagnement} onChange={update('accompagnement')} />
            <Lease value={dossier.bail} onChange={update('bail')} />
            <Household value={dossier.foyer} onChange={update('foyer')} />
            <Budget foyer={dossier.foyer} value={dossier.budget} onChange={update('budget')} />
            <Schedule
              foyer={dossier.foyer}
              budget={dossier.budget}
              value={dossier.echeancier}
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
                      {DOCUMENTS.map((document) => (
                        <DropdownMenuSub key={document}>
                          <DropdownMenuSubTrigger>{document}</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuGroup>
                              <DropdownMenuItem>Word</DropdownMenuItem>
                              <DropdownMenuItem>PDF</DropdownMenuItem>
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
                      {DOCUMENTS.map((document) => (
                        <DropdownMenuItem key={document}>{document}</DropdownMenuItem>
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
