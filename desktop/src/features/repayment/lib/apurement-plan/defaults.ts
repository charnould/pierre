import type { TenantRepaymentRow } from '../classify-tenants'
import { repaymentCreatePlanConfig } from '../repayment-create-plan-config'
import { buildInstallments, firstInstallmentDate } from './installments'
import type { AdultMember, AidItem, AmountLine, ChildMember, RepaymentPlanForm } from './types'
import { TOTAL_RENT_PRESET } from './types'

function lineId(): string {
  return `line-${Math.random().toString(36).slice(2, 8)}`
}

function memberId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export function createAmountLine(partial?: Partial<Omit<AmountLine, 'id'>>): AmountLine {
  return {
    id: lineId(),
    label: '',
    amount: 0,
    custom: false,
    personId: null,
    endMonth: '',
    month: '',
    ...partial
  }
}

export function createAidItem(partial?: Partial<Omit<AidItem, 'id'>>): AidItem {
  return {
    id: lineId(),
    label: '',
    custom: false,
    ...partial
  }
}

export function createAdultMember(partial?: Partial<Omit<AdultMember, 'id'>>): AdultMember {
  return {
    id: memberId('adult'),
    lastName: '',
    firstName: '',
    birthDate: '',
    employmentStatus: 'permanent',
    employer: '',
    cafNumber: '',
    isLeaseHolder: true,
    isOccupant: true,
    ...partial
  }
}

export function createChildMember(partial?: Partial<Omit<ChildMember, 'id'>>): ChildMember {
  return {
    id: memberId('child'),
    lastName: '',
    firstName: '',
    birthDate: '',
    isDependent: true,
    ...partial
  }
}

/** First non-empty string among tenant ledger keys. */
function tenantField(tenant: TenantRepaymentRow | undefined, ...keys: string[]): string {
  if (!tenant) return ''
  for (const key of keys) {
    const value = tenant[key]
    if (value == null) continue
    const text = String(value).trim()
    if (text) return text
  }
  return ''
}

export function createDefaultRepaymentPlanForm(tenant?: TenantRepaymentRow): RepaymentPlanForm {
  const debt = tenant ? Math.max(tenant.solde_locataire, 0) : 0
  const rent =
    tenant?.ratio_dette_loyer != null && tenant.ratio_dette_loyer > 0
      ? tenant.solde_locataire / tenant.ratio_dette_loyer
      : 0

  const banqueDeFranceStatus = 'none' as const
  const moratoriumEndDate = ''

  return {
    banqueDeFranceStatus,
    moratoriumEndDate,
    planType: 'repayment_plan',
    signed: false,
    idLocataire: tenant?.id_locataire ?? '',
    idClient: tenant?.id_client ?? '',
    idLot: tenantField(tenant, 'id_lot'),
    address: tenantField(tenant, 'adresse'),
    postalCode: tenantField(tenant, 'code_postal'),
    city: tenantField(tenant, 'commune', 'ville', 'nom_commune'),
    rentalDebt: debt,
    firstMissedPaymentDate: '',
    procedureStage: '',
    procedureStageDate: '',
    ccapexDate: '',
    ctesiDate: '',
    tenantVisitedAtHome: false,
    hasSocialWorker: false,
    socialWorkerName: '',
    socialWorkerOrganization: '',
    socialWorkerContact: '',
    socialWorkerLastContactDate: '',
    amendmentSigned: false,
    noticeDate: '',
    income: [createAmountLine()],
    expenses: [
      createAmountLine({
        label: TOTAL_RENT_PRESET,
        amount: rent > 0 ? rent : 0,
        custom: false
      })
    ],
    household: {
      adults: [createAdultMember({ isLeaseHolder: true })],
      children: []
    },
    requestedAids: [createAidItem()],
    installments: buildInstallments({
      debt,
      count: repaymentCreatePlanConfig().schedule.defaultMonths,
      firstDate: firstInstallmentDate({
        banqueDeFranceStatus,
        moratoriumEndDate
      })
    })
  }
}
