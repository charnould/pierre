import { describe, expect, test } from 'bun:test'

import type { Activite, RepaymentPlanEventContent } from '@/shared/types/activites'

import { createDefaultApurementPlanForm } from './apurement-plan/defaults'
import {
  latestActiveRepaymentPlan,
  latestEditableRepaymentPlan,
  parseRepaymentPlanForm,
  parseRepaymentPlanProposal
} from './repayment-activity-text'
import { repaymentPlanFormToSnapshot } from './repayment-plan-persist'

const activity = (
  id: number,
  type: Activite['type'],
  content: RepaymentPlanEventContent & { reason?: string }
): Activite => ({
  id,
  date_creation: `2026-09-10T10:00:0${id}Z`,
  rattachement: 'repayment:LOC-1',
  auteur: 'user:alice@example.org',
  destinataire: null,
  id_client: 'CLI-1',
  id_locataire: 'LOC-1',
  id_lot: null,
  type,
  channel: null,
  mentions: [],
  contenu: JSON.stringify(content),
  thread_id: 'plan-1',
  revision: null
})

describe('repayment plan v2 timeline projection', () => {
  test('opens only the milestone carrying the current snapshot', () => {
    const form = createDefaultApurementPlanForm()
    form.rentalDebt = 1_200
    form.installments = form.installments.slice(0, 12).map((installment) => ({
      ...installment,
      amount: 100
    }))
    const snapshot = repaymentPlanFormToSnapshot(form)
    const created = activity(1, 'repayment_plan.created', {
      version: 2,
      title: "Plan d'apurement"
    })
    const updated = activity(2, 'repayment_plan.updated', {
      version: 2,
      title: "Plan d'apurement",
      plan: snapshot,
      note: 'Accord en préparation'
    })

    expect(parseRepaymentPlanForm(created)).toBeNull()
    expect(parseRepaymentPlanForm(updated)).toMatchObject({
      rentalDebt: 1_200,
      signed: false
    })
    expect(parseRepaymentPlanProposal(updated)).toMatchObject({
      signed: false,
      planValide: false,
      note: 'Accord en préparation',
      resume: '100 € × 12 mois'
    })
    expect(latestEditableRepaymentPlan([updated, created])?.id).toBe(updated.id)
    expect(latestActiveRepaymentPlan([updated, created])).toEqual({
      row: updated,
      signed: false
    })
  })

  test('projects finalized and closed states from event types', () => {
    const snapshot = repaymentPlanFormToSnapshot(createDefaultApurementPlanForm())
    const finalized = activity(3, 'repayment_plan.finalized', {
      version: 2,
      title: "Plan d'apurement",
      plan: snapshot
    })
    const closed = activity(4, 'repayment_plan.closed', {
      version: 2,
      title: "Plan d'apurement",
      plan: snapshot,
      reason: 'execution_complete'
    })

    expect(parseRepaymentPlanForm(finalized)?.signed).toBe(true)
    expect(parseRepaymentPlanProposal(finalized)?.signed).toBe(true)
    expect(parseRepaymentPlanForm(closed)?.signed).toBe(true)
    expect(latestActiveRepaymentPlan([finalized, closed])).toBeNull()
  })

  test('keeps a withdrawn draft unsigned', () => {
    const snapshot = repaymentPlanFormToSnapshot(createDefaultApurementPlanForm())
    const withdrawn = activity(2, 'repayment_plan.closed', {
      version: 2,
      title: "Plan d'apurement",
      plan: snapshot,
      reason: 'withdrawn'
    })
    expect(parseRepaymentPlanForm(withdrawn)?.signed).toBe(false)
  })
})
