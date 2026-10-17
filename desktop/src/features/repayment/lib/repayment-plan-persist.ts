import type { RepaymentPlanEventContent, RepaymentPlanSnapshot } from '@/shared/types/activites'

import { createAidItem, createAmountLine } from './apurement-plan/defaults'
import {
  AID_PRESETS,
  CREDIT_EXPENSE_PRESET,
  EXPENSE_PRESETS,
  INCOME_PRESETS,
  PLAN_TYPE_LABELS,
  TOTAL_RENT_PRESET,
  type RepaymentPlanForm
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

export function repaymentPlanFormToSnapshot(form: RepaymentPlanForm): RepaymentPlanSnapshot {
  return {
    kind: form.planType,
    tenantReference: form.idLocataire,
    clientReference: form.idClient,
    address: {
      line: form.address,
      postalCode: form.postalCode,
      city: form.city,
      idLot: form.idLot
    },
    debt: {
      amount: form.rentalDebt,
      ...(form.firstMissedPaymentDate
        ? { firstMissedPaymentDate: form.firstMissedPaymentDate }
        : {}),
      procedureStage: form.procedureStage,
      procedureStageDate: form.procedureStageDate
    },
    procedures: {
      banqueDeFrance: {
        status: form.banqueDeFranceStatus,
        ...(form.moratoriumEndDate ? { moratoriumEndDate: form.moratoriumEndDate } : {})
      },
      ccapexDate: form.ccapexDate,
      ctesiDate: form.ctesiDate
    },
    socialWorker: form.hasSocialWorker
      ? {
          name: form.socialWorkerName,
          organization: form.socialWorkerOrganization,
          contact: form.socialWorkerContact,
          lastContactDate: form.socialWorkerLastContactDate
        }
      : null,
    amendmentSigned: form.amendmentSigned,
    noticeDate: form.noticeDate,
    tenantVisitedAtHome: form.tenantVisitedAtHome,
    household: {
      adults: form.household.adults.map((adult) => ({
        id: adult.id,
        lastName: adult.lastName,
        firstName: adult.firstName,
        birthDate: adult.birthDate,
        employmentStatus: adult.employmentStatus,
        employer: adult.employer,
        cafNumber: adult.cafNumber,
        leaseHolder: adult.isLeaseHolder,
        occupant: adult.isOccupant
      })),
      children: form.household.children.map((child) => ({
        id: child.id,
        lastName: child.lastName,
        firstName: child.firstName,
        birthDate: child.birthDate,
        dependent: child.isDependent
      }))
    },
    budget: {
      income: form.income
        .filter(
          (line) =>
            Boolean(line.label.trim()) ||
            line.amount !== 0 ||
            line.personId != null ||
            Boolean(line.month)
        )
        .map((line) => ({
          label: line.label,
          amount: line.amount,
          ...(line.personId != null ? { personId: line.personId } : {}),
          ...(line.month ? { month: line.month } : {})
        })),
      expenses: form.expenses
        .filter((line) => Boolean(line.label.trim()) || line.amount !== 0 || Boolean(line.month))
        .map((line) => ({
          label: line.label,
          amount: line.amount,
          ...(!line.month && line.label === CREDIT_EXPENSE_PRESET && line.endMonth
            ? { endMonth: line.endMonth }
            : {}),
          ...(line.month ? { month: line.month } : {})
        }))
    },
    requestedAids: form.requestedAids.map((aid) => aid.label.trim()).filter(Boolean),
    installments: form.installments.map((installment) => ({
      date: installment.date,
      amount: installment.amount
    }))
  }
}

export function repaymentPlanSnapshotToForm(
  snapshot: RepaymentPlanSnapshot,
  signed: boolean
): RepaymentPlanForm {
  const income = snapshot.budget.income.map((line) =>
    createAmountLine({
      label: line.label,
      amount: line.amount,
      custom: isCustom(line.label, INCOME_PRESETS),
      personId: line.personId ?? null,
      month: line.month ?? ''
    })
  )
  const expenses = snapshot.budget.expenses.map((line) =>
    createAmountLine({
      label: line.label,
      amount: line.amount,
      custom: isCustom(line.label, EXPENSE_PRESETS) && line.label !== TOTAL_RENT_PRESET,
      endMonth: line.endMonth ?? '',
      month: line.month ?? ''
    })
  )
  const requestedAids = snapshot.requestedAids.map((label) =>
    createAidItem({ label, custom: isCustom(label, AID_PRESETS) })
  )
  return {
    banqueDeFranceStatus: snapshot.procedures.banqueDeFrance.status,
    moratoriumEndDate: snapshot.procedures.banqueDeFrance.moratoriumEndDate ?? '',
    planType: snapshot.kind,
    signed,
    idLocataire: snapshot.tenantReference,
    idClient: snapshot.clientReference,
    idLot: snapshot.address.idLot,
    address: snapshot.address.line,
    postalCode: snapshot.address.postalCode,
    city: snapshot.address.city,
    rentalDebt: snapshot.debt.amount,
    firstMissedPaymentDate: snapshot.debt.firstMissedPaymentDate ?? '',
    procedureStage: snapshot.debt.procedureStage,
    procedureStageDate: snapshot.debt.procedureStageDate,
    ccapexDate: snapshot.procedures.ccapexDate,
    ctesiDate: snapshot.procedures.ctesiDate,
    hasSocialWorker: snapshot.socialWorker != null,
    socialWorkerName: snapshot.socialWorker?.name ?? '',
    socialWorkerOrganization: snapshot.socialWorker?.organization ?? '',
    socialWorkerContact: snapshot.socialWorker?.contact ?? '',
    socialWorkerLastContactDate: snapshot.socialWorker?.lastContactDate ?? '',
    amendmentSigned: snapshot.amendmentSigned,
    noticeDate: snapshot.noticeDate,
    tenantVisitedAtHome: snapshot.tenantVisitedAtHome,
    income: income.length > 0 ? income : [createAmountLine()],
    expenses:
      expenses.length > 0
        ? expenses
        : [createAmountLine({ label: TOTAL_RENT_PRESET, custom: false })],
    household: {
      adults: snapshot.household.adults.map((adult) => ({
        id: adult.id,
        lastName: adult.lastName,
        firstName: adult.firstName,
        birthDate: adult.birthDate,
        employmentStatus: adult.employmentStatus,
        employer: adult.employer,
        cafNumber: adult.cafNumber,
        isLeaseHolder: adult.leaseHolder,
        isOccupant: adult.occupant
      })),
      children: snapshot.household.children.map((child) => ({
        id: child.id,
        lastName: child.lastName,
        firstName: child.firstName,
        birthDate: child.birthDate,
        isDependent: child.dependent
      }))
    },
    requestedAids: requestedAids.length > 0 ? requestedAids : [createAidItem()],
    installments: snapshot.installments.map((installment) => ({
      id: localId('inst'),
      date: installment.date,
      amount: installment.amount
    }))
  }
}

export function buildPlanContenu(form: RepaymentPlanForm, note: string): string {
  const content: RepaymentPlanEventContent = {
    version: 2,
    title: PLAN_TYPE_LABELS[form.planType],
    plan: repaymentPlanFormToSnapshot(form),
    ...(note ? { note } : {})
  }
  return JSON.stringify(content)
}
