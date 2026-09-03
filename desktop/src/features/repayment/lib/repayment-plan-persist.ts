import type { RepaymentPlanEventContent, RepaymentPlanSnapshot } from '@/shared/types/activites'

import { createAidItem, createAmountLine } from './apurement-plan/defaults'
import {
  AID_PRESETS,
  EXPENSE_PRESETS,
  INCOME_PRESETS,
  PLAN_TYPE_LABELS,
  TOTAL_RENT_PRESET,
  type ApurementPlanFormData
} from './apurement-plan/types'

export function resolvePlanPersistMode(existingActivityId?: number): 'create' | 'patch' {
  return existingActivityId ? 'patch' : 'create'
}

export function shouldApplyPlanAdvancement(
  existingActivityId: number | undefined,
  initialSigned: boolean | null,
  signed: boolean
): boolean {
  return existingActivityId == null || initialSigned == null || signed !== initialSigned
}

export function resolvePlanComment(nextComment: string | undefined, savedComment: string): string {
  return nextComment !== undefined ? nextComment.trim() : savedComment
}

const localId = (prefix: string): string => `${prefix}-${Math.random().toString(36).slice(2, 8)}`

const isCustom = (label: string, presets: readonly string[]): boolean =>
  Boolean(label.trim()) && !presets.includes(label)

export function repaymentPlanFormToSnapshot(form: ApurementPlanFormData): RepaymentPlanSnapshot {
  return {
    kind: form.planType,
    tenant_reference: form.idLocataire,
    client_reference: form.idClient,
    occupancy: form.occupancyType,
    address: {
      line: form.address,
      postal_code: form.postalCode,
      city: form.city
    },
    debt: {
      amount: form.rentalDebt,
      ...(form.firstMissedPaymentDate
        ? { first_missed_payment_date: form.firstMissedPaymentDate }
        : {}),
      ...(form.paymentOrderDate ? { payment_order_date: form.paymentOrderDate } : {})
    },
    procedures: {
      banque_de_france: {
        status: form.banqueDeFranceStatus,
        ...(form.moratoriumEndDate ? { moratorium_end_date: form.moratoriumEndDate } : {})
      },
      ccapex_opened: form.ccapexOpened
    },
    social_worker: form.hasSocialWorker
      ? { name: form.socialWorkerName, organization: form.socialWorkerOrganization }
      : null,
    household: {
      adults: form.household.adults.map((adult) => ({
        id: adult.id,
        last_name: adult.lastName,
        first_name: adult.firstName,
        birth_date: adult.birthDate,
        employment_status: adult.employmentStatus,
        pension_fund: adult.pensionFund,
        caf_number: adult.cafNumber,
        lease_holder: adult.isLeaseHolder
      })),
      children: form.household.children.map((child) => ({
        id: child.id,
        last_name: child.lastName,
        first_name: child.firstName,
        birth_date: child.birthDate,
        dependent: child.isDependent
      }))
    },
    budget: {
      income: form.income
        .filter((line) => Boolean(line.label.trim()) || line.amount !== 0 || line.personId != null)
        .map((line) => ({
          label: line.label,
          amount: line.amount,
          ...(line.personId != null ? { person_id: line.personId } : {})
        })),
      expenses: form.expenses
        .filter((line) => Boolean(line.label.trim()) || line.amount !== 0)
        .map((line) => ({ label: line.label, amount: line.amount }))
    },
    requested_aids: form.requestedAids.map((aid) => aid.label.trim()).filter(Boolean),
    installments: form.installments.map((installment) => ({
      year_month: installment.yearMonth,
      amount: installment.amount
    }))
  }
}

export function repaymentPlanSnapshotToForm(
  snapshot: RepaymentPlanSnapshot,
  signed: boolean
): ApurementPlanFormData {
  const income = snapshot.budget.income.map((line) =>
    createAmountLine({
      label: line.label,
      amount: line.amount,
      custom: isCustom(line.label, INCOME_PRESETS),
      personId: line.person_id ?? null
    })
  )
  const expenses = snapshot.budget.expenses.map((line) =>
    createAmountLine({
      label: line.label,
      amount: line.amount,
      custom: isCustom(line.label, EXPENSE_PRESETS)
    })
  )
  const requestedAids = snapshot.requested_aids.map((label) =>
    createAidItem({ label, custom: isCustom(label, AID_PRESETS) })
  )
  return {
    banqueDeFranceStatus: snapshot.procedures.banque_de_france.status,
    moratoriumEndDate: snapshot.procedures.banque_de_france.moratorium_end_date ?? '',
    planType: snapshot.kind,
    occupancyType: snapshot.occupancy,
    signed,
    idLocataire: snapshot.tenant_reference,
    idClient: snapshot.client_reference,
    address: snapshot.address.line,
    postalCode: snapshot.address.postal_code,
    city: snapshot.address.city,
    rentalDebt: snapshot.debt.amount,
    firstMissedPaymentDate: snapshot.debt.first_missed_payment_date ?? '',
    paymentOrderDate: snapshot.debt.payment_order_date ?? '',
    ccapexOpened: snapshot.procedures.ccapex_opened,
    hasSocialWorker: snapshot.social_worker != null,
    socialWorkerName: snapshot.social_worker?.name ?? '',
    socialWorkerOrganization: snapshot.social_worker?.organization ?? '',
    income: income.length > 0 ? income : [createAmountLine()],
    expenses:
      expenses.length > 0
        ? expenses
        : [createAmountLine({ label: TOTAL_RENT_PRESET, custom: false })],
    household: {
      adults: snapshot.household.adults.map((adult) => ({
        id: adult.id,
        lastName: adult.last_name,
        firstName: adult.first_name,
        birthDate: adult.birth_date,
        employmentStatus: adult.employment_status,
        pensionFund: adult.pension_fund,
        cafNumber: adult.caf_number,
        isLeaseHolder: adult.lease_holder
      })),
      children: snapshot.household.children.map((child) => ({
        id: child.id,
        lastName: child.last_name,
        firstName: child.first_name,
        birthDate: child.birth_date,
        isDependent: child.dependent
      }))
    },
    requestedAids: requestedAids.length > 0 ? requestedAids : [createAidItem()],
    installments: snapshot.installments.map((installment) => ({
      id: localId('inst'),
      yearMonth: installment.year_month,
      amount: installment.amount
    }))
  }
}

export function buildPlanContenu(form: ApurementPlanFormData, note: string): string {
  const content: RepaymentPlanEventContent = {
    version: 2,
    title: PLAN_TYPE_LABELS[form.planType],
    plan: repaymentPlanFormToSnapshot(form),
    ...(note ? { note } : {})
  }
  return JSON.stringify(content)
}
