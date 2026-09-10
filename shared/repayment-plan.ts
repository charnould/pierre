export const REPAYMENT_PLAN_EVENT_TYPES = [
  'repayment_plan.created',
  'repayment_plan.updated',
  'repayment_plan.finalized',
  'repayment_plan.closed'
] as const

export type RepaymentPlanEventType = (typeof REPAYMENT_PLAN_EVENT_TYPES)[number]

export const REPAYMENT_PLAN_CLOSE_REASONS = [
  'execution_complete',
  'non_respect',
  'remplacement_par_nouveau_plan',
  'effacement_de_dette',
  'withdrawn'
] as const

export type RepaymentPlanCloseReason = (typeof REPAYMENT_PLAN_CLOSE_REASONS)[number]

export const REPAYMENT_PLAN_EMPLOYMENT_STATUSES = [
  'permanent',
  'permanent_trial',
  'fixed_term',
  'fixed_term_trial',
  'temporary',
  'unemployed',
  'retired'
] as const

export type RepaymentPlanEmploymentStatus = (typeof REPAYMENT_PLAN_EMPLOYMENT_STATUSES)[number]

export type RepaymentPlanSnapshot = {
  kind: 'repayment_plan' | 'social_cohesion_protocol'
  tenant_reference: string
  client_reference: string
  occupancy: 'lease' | 'accession'
  address: {
    line: string
    postal_code: string
    city: string
  }
  debt: {
    amount: number
    first_missed_payment_date?: string
    payment_order_date?: string
  }
  procedures: {
    banque_de_france: {
      status: 'none' | 'admissible_pending' | 'repayment_plan_active' | 'moratorium'
      moratorium_end_date?: string
    }
    ccapex_opened: boolean
  }
  social_worker: { name: string; organization: string } | null
  household: {
    adults: Array<{
      id: string
      last_name: string
      first_name: string
      birth_date: string
      employment_status: RepaymentPlanEmploymentStatus
      pension_fund: string
      caf_number: string
      lease_holder: boolean
    }>
    children: Array<{
      id: string
      last_name: string
      first_name: string
      birth_date: string
      dependent: boolean
    }>
  }
  budget: {
    income: Array<{ label: string; amount: number; person_id?: string | null }>
    expenses: Array<{ label: string; amount: number }>
  }
  requested_aids: string[]
  installments: Array<{ year_month: string; amount: number }>
}

export type RepaymentPlanEventContent = {
  version: 2
  title: string
  plan?: RepaymentPlanSnapshot
  note?: string
}

export type RepaymentPlanClosedContent = RepaymentPlanEventContent & {
  reason: RepaymentPlanCloseReason
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const YEAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const as_record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null

const as_string = (value: unknown): string | null => (typeof value === 'string' ? value : null)

const as_non_empty_string = (value: unknown): string | null => {
  const text = as_string(value)?.trim() ?? ''
  return text || null
}

const as_finite_number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

const as_optional_date = (value: unknown): string | undefined | null => {
  if (value === undefined) return undefined
  return typeof value === 'string' && DATE_PATTERN.test(value) ? value : null
}

const parse_amount_lines = (
  value: unknown,
  withPerson: boolean
): Array<{ label: string; amount: number; person_id?: string | null }> | null => {
  if (!Array.isArray(value)) return null
  const lines: Array<{ label: string; amount: number; person_id?: string | null }> = []
  for (const item of value) {
    const record = as_record(item)
    const label = as_string(record?.['label'])
    const amount = as_finite_number(record?.['amount'])
    if (!record || label === null || amount === null) return null
    const personId = record['person_id']
    if (withPerson && personId !== undefined && personId !== null && typeof personId !== 'string') {
      return null
    }
    lines.push({
      label,
      amount,
      ...(withPerson && personId !== undefined ? { person_id: personId as string | null } : {})
    })
  }
  return lines
}

export const parse_repayment_plan_snapshot = (value: unknown): RepaymentPlanSnapshot | null => {
  const plan = as_record(value)
  if (!plan) return null
  if (plan['kind'] !== 'repayment_plan' && plan['kind'] !== 'social_cohesion_protocol') return null
  if (plan['occupancy'] !== 'lease' && plan['occupancy'] !== 'accession') return null
  const tenantReference = as_string(plan['tenant_reference'])
  const clientReference = as_string(plan['client_reference'])
  const address = as_record(plan['address'])
  const addressLine = as_string(address?.['line'])
  const postalCode = as_string(address?.['postal_code'])
  const city = as_string(address?.['city'])
  const debt = as_record(plan['debt'])
  const debtAmount = as_finite_number(debt?.['amount'])
  const firstMissedPaymentDate = as_optional_date(debt?.['first_missed_payment_date'])
  const paymentOrderDate = as_optional_date(debt?.['payment_order_date'])
  if (
    tenantReference === null ||
    clientReference === null ||
    !address ||
    addressLine === null ||
    postalCode === null ||
    city === null ||
    !debt ||
    debtAmount === null ||
    firstMissedPaymentDate === null ||
    paymentOrderDate === null
  ) {
    return null
  }

  const procedures = as_record(plan['procedures'])
  const banqueDeFrance = as_record(procedures?.['banque_de_france'])
  const banqueDeFranceStatus = banqueDeFrance?.['status']
  const moratoriumEndDate = as_optional_date(banqueDeFrance?.['moratorium_end_date'])
  if (
    !procedures ||
    !banqueDeFrance ||
    !['none', 'admissible_pending', 'repayment_plan_active', 'moratorium'].includes(
      String(banqueDeFranceStatus)
    ) ||
    moratoriumEndDate === null ||
    typeof procedures['ccapex_opened'] !== 'boolean'
  ) {
    return null
  }

  const socialWorkerValue = plan['social_worker']
  const socialWorker = socialWorkerValue === null ? null : as_record(socialWorkerValue)
  const socialWorkerName = socialWorker ? as_string(socialWorker['name']) : null
  const socialWorkerOrganization = socialWorker ? as_string(socialWorker['organization']) : null
  if (
    socialWorkerValue !== null &&
    (!socialWorker || socialWorkerName === null || socialWorkerOrganization === null)
  ) {
    return null
  }

  const household = as_record(plan['household'])
  if (!household || !Array.isArray(household['adults']) || !Array.isArray(household['children'])) {
    return null
  }
  const adults: RepaymentPlanSnapshot['household']['adults'] = []
  for (const item of household['adults']) {
    const adult = as_record(item)
    const id = as_non_empty_string(adult?.['id'])
    const lastName = as_string(adult?.['last_name'])
    const firstName = as_string(adult?.['first_name'])
    const birthDate = as_string(adult?.['birth_date'])
    const employmentStatus = adult?.['employment_status']
    const pensionFund = as_string(adult?.['pension_fund'])
    const cafNumber = as_string(adult?.['caf_number'])
    if (
      !adult ||
      !id ||
      lastName === null ||
      firstName === null ||
      birthDate === null ||
      (birthDate !== '' && !DATE_PATTERN.test(birthDate)) ||
      !(REPAYMENT_PLAN_EMPLOYMENT_STATUSES as readonly unknown[]).includes(employmentStatus) ||
      pensionFund === null ||
      cafNumber === null ||
      typeof adult['lease_holder'] !== 'boolean'
    ) {
      return null
    }
    adults.push({
      id,
      last_name: lastName,
      first_name: firstName,
      birth_date: birthDate,
      employment_status: employmentStatus as RepaymentPlanEmploymentStatus,
      pension_fund: pensionFund,
      caf_number: cafNumber,
      lease_holder: adult['lease_holder']
    })
  }
  const children: RepaymentPlanSnapshot['household']['children'] = []
  for (const item of household['children']) {
    const child = as_record(item)
    const id = as_non_empty_string(child?.['id'])
    const lastName = as_string(child?.['last_name'])
    const firstName = as_string(child?.['first_name'])
    const birthDate = as_string(child?.['birth_date'])
    if (
      !child ||
      !id ||
      lastName === null ||
      firstName === null ||
      birthDate === null ||
      (birthDate !== '' && !DATE_PATTERN.test(birthDate)) ||
      typeof child['dependent'] !== 'boolean'
    ) {
      return null
    }
    children.push({
      id,
      last_name: lastName,
      first_name: firstName,
      birth_date: birthDate,
      dependent: child['dependent']
    })
  }

  const budget = as_record(plan['budget'])
  const income = parse_amount_lines(budget?.['income'], true)
  const expenses = parse_amount_lines(budget?.['expenses'], false)
  if (!budget || !income || !expenses) return null
  if (
    !Array.isArray(plan['requested_aids']) ||
    !plan['requested_aids'].every((item) => typeof item === 'string')
  ) {
    return null
  }
  if (!Array.isArray(plan['installments'])) return null
  const installments: RepaymentPlanSnapshot['installments'] = []
  for (const item of plan['installments']) {
    const installment = as_record(item)
    const yearMonth = as_string(installment?.['year_month'])
    const amount = as_finite_number(installment?.['amount'])
    if (!installment || !yearMonth || !YEAR_MONTH_PATTERN.test(yearMonth) || amount === null) {
      return null
    }
    installments.push({ year_month: yearMonth, amount })
  }

  return {
    kind: plan['kind'],
    tenant_reference: tenantReference,
    client_reference: clientReference,
    occupancy: plan['occupancy'],
    address: { line: addressLine, postal_code: postalCode, city },
    debt: {
      amount: debtAmount,
      ...(firstMissedPaymentDate ? { first_missed_payment_date: firstMissedPaymentDate } : {}),
      ...(paymentOrderDate ? { payment_order_date: paymentOrderDate } : {})
    },
    procedures: {
      banque_de_france: {
        status:
          banqueDeFranceStatus as RepaymentPlanSnapshot['procedures']['banque_de_france']['status'],
        ...(moratoriumEndDate ? { moratorium_end_date: moratoriumEndDate } : {})
      },
      ccapex_opened: procedures['ccapex_opened']
    },
    social_worker: socialWorker
      ? { name: socialWorkerName!, organization: socialWorkerOrganization! }
      : null,
    household: { adults, children },
    budget: { income, expenses },
    requested_aids: [...plan['requested_aids']],
    installments
  }
}

export const is_repayment_plan_event_type = (type: string): type is RepaymentPlanEventType =>
  (REPAYMENT_PLAN_EVENT_TYPES as readonly string[]).includes(type)

export const parse_repayment_plan_content = (
  type: string,
  raw: string
): RepaymentPlanEventContent | RepaymentPlanClosedContent | null => {
  if (!is_repayment_plan_event_type(type)) return null
  let value: Record<string, unknown>
  try {
    const parsed = JSON.parse(raw) as unknown
    const record = as_record(parsed)
    if (!record) return null
    value = record
  } catch {
    return null
  }
  if (value['version'] !== 2) return null
  const title = as_non_empty_string(value['title'])
  if (!title) return null
  const plan =
    value['plan'] === undefined ? undefined : parse_repayment_plan_snapshot(value['plan'])
  if (value['plan'] !== undefined && !plan) return null
  const note = as_non_empty_string(value['note'])
  if (value['note'] !== undefined && typeof value['note'] !== 'string') return null
  const base: RepaymentPlanEventContent = {
    version: 2,
    title,
    ...(plan ? { plan } : {}),
    ...(note ? { note } : {})
  }
  if (type !== 'repayment_plan.closed') {
    if (value['reason'] !== undefined) return null
    return base
  }
  if (!(REPAYMENT_PLAN_CLOSE_REASONS as readonly unknown[]).includes(value['reason'])) return null
  return { ...base, reason: value['reason'] as RepaymentPlanCloseReason }
}
