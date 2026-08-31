import { ChevronDown, FileDown } from 'lucide-react'
import { useCallback, useState } from 'react'

import { RepaymentMentionTextarea } from '@/features/repayment/components/RepaymentMentionTextarea'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { toast } from '@/shared/components/ui/toast'

import { createDefaultApurementPlanForm } from '../../lib/apurement-plan/defaults'
import { exportApurementPlanDocx } from '../../lib/apurement-plan/export-plan-docx'
import { rebuildInstallments } from '../../lib/apurement-plan/installments'
import type { ApurementPlanFormData } from '../../lib/apurement-plan/types'
import type { TenantRepaymentRow } from '../../lib/classify-tenants'
import { extractMentionsFromText } from '../../lib/repayment-mention'
import {
  PLAN_CLOSE_MOTIF_LABELS,
  PLAN_CLOSE_MOTIFS,
  type PlanCloseMotif
} from '../../lib/repayment-plan-close'
import { planWorkspaceFooterVisibility } from '../../lib/repayment-plan-export-only'
import {
  buildPlanContenu,
  resolvePlanComment,
  shouldApplyPlanAdvancement
} from '../../lib/repayment-plan-persist'
import { invalidateRepaymentTimelineCache } from '../../lib/repayment-timeline-cache'
import { PlanFormColumn } from './PlanFormColumn'

export type PlanSavedPayload = {
  id_locataire: string
  activityId: number
  signed: boolean
  /** True on first create, or when `signed` changed vs the reopened plan. */
  applyAdvancement: boolean
}

export type PlanClosedPayload = {
  id_locataire: string
  activityId: number
  motif: PlanCloseMotif
}

export type PlanDeletedPayload = {
  id_locataire: string
}

interface Props {
  url?: string
  tenant: TenantRepaymentRow
  initialForm?: ApurementPlanFormData
  existingActivityId?: number
  initialComment?: string
  /** Form + .docx export only — hide persist/close/delete actions. */
  exportOnly?: boolean
  onClose: () => void
  onSaved?: (payload: PlanSavedPayload) => void
  onPlanClosed?: (payload: PlanClosedPayload) => void
  onPlanDeleted?: (payload: PlanDeletedPayload) => void
}

export function RepaymentPlanWorkspace({
  url,
  tenant,
  initialForm,
  existingActivityId,
  initialComment = '',
  exportOnly = false,
  onClose,
  onSaved,
  onPlanClosed,
  onPlanDeleted
}: Props) {
  const [form, setForm] = useState(() => initialForm ?? createDefaultApurementPlanForm(tenant))
  const [savedComment, setSavedComment] = useState(() => initialComment.trim())
  const [saving, setSaving] = useState(false)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [exporting, setExporting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [closeMotif, setCloseMotif] = useState<PlanCloseMotif | null>(null)
  const initialSigned = initialForm?.signed ?? null

  const readOnly = initialForm?.signed === true
  const hasActivity = existingActivityId != null

  const patchForm = useCallback(
    (patch: Partial<ApurementPlanFormData>) => {
      if (readOnly) return
      setForm((prev) => {
        const next = { ...prev, ...patch }
        if ('banqueDeFranceStatus' in patch || 'moratoriumEndDate' in patch) {
          next.installments = rebuildInstallments(next, new Date(), { resetFirstMonth: true })
        } else if ('rentalDebt' in patch) {
          next.installments = rebuildInstallments(next)
        }
        return next
      })
    },
    [readOnly]
  )

  const persistPlan = useCallback(
    async (commentaire?: string): Promise<boolean> => {
      if (readOnly) return false
      const comment = resolvePlanComment(commentaire, savedComment)
      const contenu = buildPlanContenu(form, tenant.id_locataire, comment)

      if (!url) {
        toast.add({ title: 'Plan prêt (aperçu local)', type: 'success' })
        console.info('[apurement-plan]', contenu)
        return true
      }

      const recipients = comment ? extractMentionsFromText(comment) : []
      const applyAdvancement = shouldApplyPlanAdvancement(
        existingActivityId,
        initialSigned,
        form.signed
      )

      setSaving(true)
      try {
        let activityId: number | undefined

        if (existingActivityId) {
          const response = await window.api?.patchActivity({
            url,
            id: existingActivityId,
            patch: { operation: 'edit_content', contenu }
          })
          activityId = response?.data?.id ?? existingActivityId
          if (!response?.data?.id) {
            toast.add({ title: "Le plan n'a pas pu être enregistré", type: 'error' })
            return false
          }
        } else {
          const response = await window.api?.createActivity({
            url,
            contexte: 'repayment',
            ref: tenant.id_locataire,
            type: 'repayment_plan',
            statut: form.signed ? 'logged' : 'draft',
            recipients: recipients.length > 0 ? recipients : undefined,
            contenu
          })
          activityId = response?.data?.id
          if (!activityId) {
            toast.add({ title: "Le plan n'a pas pu être enregistré", type: 'error' })
            return false
          }
        }

        setSavedComment(comment)
        invalidateRepaymentTimelineCache(url, tenant.id_client, tenant.id_locataire)
        toast.add({ title: 'Plan enregistré', type: 'success' })
        onSaved?.({
          id_locataire: tenant.id_locataire,
          activityId,
          signed: form.signed,
          applyAdvancement
        })
        return true
      } finally {
        setSaving(false)
      }
    },
    [
      existingActivityId,
      form,
      initialSigned,
      onSaved,
      readOnly,
      savedComment,
      tenant.id_client,
      tenant.id_locataire,
      url
    ]
  )

  const handleSave = () => {
    void persistPlan()
  }

  const handleSaveWithComment = () => {
    void persistPlan(commentDraft).then((ok) => {
      if (!ok) return
      setCommentOpen(false)
      setCommentDraft('')
    })
  }

  const handleExport = () => {
    setExporting(true)
    void exportApurementPlanDocx(form, {
      id_locataire: tenant.id_locataire,
      id_client: tenant.id_client
    })
      .then((ok) => {
        if (!ok) {
          toast.add({ title: "L'export Word a échoué", type: 'error' })
          return
        }
        toast.add({ title: 'Document Word téléchargé', type: 'success' })
      })
      .catch(() => {
        toast.add({ title: "L'export Word a échoué", type: 'error' })
      })
      .finally(() => setExporting(false))
  }

  const handleDelete = async () => {
    if (!url || !existingActivityId) return
    setSaving(true)
    try {
      const response = await window.api?.deleteActivity({ url, id: existingActivityId })
      if (!response) {
        toast.add({ title: "Le plan n'a pas pu être supprimé", type: 'error' })
        return
      }
      invalidateRepaymentTimelineCache(url, tenant.id_client, tenant.id_locataire)
      toast.add({ title: 'Plan supprimé', type: 'success' })
      setDeleteOpen(false)
      onPlanDeleted?.({ id_locataire: tenant.id_locataire })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmClose = async () => {
    if (!url || !existingActivityId || !closeMotif || !form.signed) return
    setSaving(true)
    try {
      const closed = await window.api?.createActivity({
        url,
        contexte: 'repayment',
        ref: tenant.id_locataire,
        type: 'repayment_plan_close',
        statut: 'logged',
        contenu: JSON.stringify({
          version: 1,
          id_activite_plan: existingActivityId,
          motif: PLAN_CLOSE_MOTIF_LABELS[closeMotif]
        })
      })
      if (!closed?.data?.id) {
        toast.add({ title: "Le plan n'a pas pu être clôturé", type: 'error' })
        return
      }

      invalidateRepaymentTimelineCache(url, tenant.id_client, tenant.id_locataire)
      toast.add({ title: 'Plan clôturé', type: 'success' })
      const motif = closeMotif
      setCloseMotif(null)
      onPlanClosed?.({
        id_locataire: tenant.id_locataire,
        activityId: closed.data.id,
        motif
      })
    } finally {
      setSaving(false)
    }
  }

  const pendingCloseLabel = closeMotif ? PLAN_CLOSE_MOTIF_LABELS[closeMotif] : null
  const footer = planWorkspaceFooterVisibility(exportOnly, hasActivity, form.signed)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <PlanFormColumn
        key={existingActivityId ?? tenant.id_locataire}
        form={form}
        onPatch={patchForm}
        readOnly={readOnly}
        onClose={onClose}
        footerAction={
          <div className="flex w-full flex-nowrap items-center justify-end gap-2 pb-2">
            <div className="me-auto flex shrink-0 items-center gap-2">
              <Switch
                id="plan-signed"
                checked={form.signed}
                disabled={readOnly}
                onCheckedChange={(signed) => patchForm({ signed })}
              />
              <Label htmlFor="plan-signed" className="text-sm font-medium whitespace-nowrap">
                Plan ou protocole signé
              </Label>
            </div>
            {footer.showDelete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                Supprimer
              </Button>
            ) : null}
            {footer.showClose ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button type="button" variant="outline" size="sm" disabled={saving} />}
                >
                  Clôturer
                  <ChevronDown data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    {PLAN_CLOSE_MOTIFS.map((motif) => (
                      <DropdownMenuItem key={motif} onClick={() => setCloseMotif(motif)}>
                        {PLAN_CLOSE_MOTIF_LABELS[motif]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {footer.showExport ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exporting}
                onClick={handleExport}
              >
                <FileDown data-icon="inline-start" />
                Exporter en .docx
              </Button>
            ) : null}
            {footer.showSave ? (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button type="button" size="sm" disabled={saving} />}>
                  Enregistrer
                  <ChevronDown data-icon="inline-end" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleSave}>Enregistrer</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setCommentDraft(savedComment)
                        setCommentOpen(true)
                      }}
                    >
                      Enregistrer avec une note
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        }
      />

      <Dialog
        open={commentOpen}
        onOpenChange={(open) => {
          setCommentOpen(open)
          if (!open) setCommentDraft('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer avec une note</DialogTitle>
            <DialogDescription>
              Le plan est enregistré avec votre note. Utilisez @ pour demander une validation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <RepaymentMentionTextarea
              url={url}
              value={commentDraft}
              onChange={setCommentDraft}
              placeholder="Note… Tapez @ pour mentionner un collègue"
              rows={5}
              className="min-h-28"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setCommentOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || !commentDraft.trim()}
              onClick={handleSaveWithComment}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le plan</DialogTitle>
            <DialogDescription>
              Cette action est définitive. Le plan disparaîtra de la timeline du dossier.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setDeleteOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={saving}
              onClick={() => void handleDelete()}
            >
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={closeMotif != null}
        onOpenChange={(open) => {
          if (!open) setCloseMotif(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clôturer le plan</DialogTitle>
            <DialogDescription>
              {pendingCloseLabel
                ? `Motif : ${pendingCloseLabel}. Le dossier basculera vers la phase configurée pour ce motif.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setCloseMotif(null)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving}
              onClick={() => void handleConfirmClose()}
            >
              Clôturer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
