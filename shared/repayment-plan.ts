const REPAYMENT_PLAN_EVENT_TYPES = [
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

export const PROCEDURE_STAGES = [
  'amiable',
  'cdp',
  'assignation',
  'audience',
  'delibere',
  'jugement',
  'signification',
  'cql'
] as const

export type ProcedureStage = (typeof PROCEDURE_STAGES)[number]

/** Plus longue durée d’échéancier saisissable. Les seuils de confirmation s’arrêtent avant. */
export const MAX_SCHEDULE_MONTHS = 36

const REPAYMENT_PLAN_EMPLOYMENT_STATUSES = [
  'permanent',
  'permanent_trial',
  'fixed_term',
  'fixed_term_trial',
  'temporary',
  'self_employed',
  'business_owner',
  'civil_servant',
  'unemployed',
  'student',
  'retired',
  'inactive',
  'other'
] as const

type RepaymentPlanEmploymentStatus = (typeof REPAYMENT_PLAN_EMPLOYMENT_STATUSES)[number]

export type RepaymentPlanSnapshot = {
  kind: 'repayment_plan' | 'social_cohesion_protocol'
  tenantReference: string
  clientReference: string
  address: {
    line: string
    postalCode: string
    city: string
    idLot: string
  }
  debt: {
    amount: number
    firstMissedPaymentDate?: string
    procedureStage: ProcedureStage | ''
    procedureStageDate: string
  }
  procedures: {
    banqueDeFrance: {
      status: 'none' | 'admissible_pending' | 'repayment_plan_active' | 'prp' | 'moratorium'
      moratoriumEndDate?: string
    }
    ccapexDate: string
    ctesiDate: string
  }
  tenantVisitedAtHome: boolean
  socialWorker: {
    name: string
    organization: string
    contact: string
    lastContactDate: string
  } | null
  amendmentSigned: boolean
  noticeDate: string
  household: {
    adults: Array<{
      id: string
      lastName: string
      firstName: string
      birthDate: string
      employmentStatus: RepaymentPlanEmploymentStatus
      employer: string
      cafNumber: string
      leaseHolder: boolean
      occupant: boolean
    }>
    children: Array<{
      id: string
      lastName: string
      firstName: string
      birthDate: string
      dependent: boolean
    }>
  }
  budget: {
    income: Array<{ label: string; amount: number; personId?: string | null; month?: string }>
    expenses: Array<{ label: string; amount: number; endMonth?: string; month?: string }>
  }
  requestedAids: string[]
  installments: Array<{ date: string; amount: number }>
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
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

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

const as_optional_month = (value: unknown): string | undefined | null => {
  if (value === undefined) return undefined
  return typeof value === 'string' && MONTH_PATTERN.test(value) ? value : null
}

const parse_amount_lines = (
  value: unknown,
  withPerson: boolean
): Array<{
  label: string
  amount: number
  personId?: string | null
  endMonth?: string
  month?: string
}> | null => {
  if (!Array.isArray(value)) return null
  const lines: Array<{
    label: string
    amount: number
    personId?: string | null
    endMonth?: string
    month?: string
  }> = []
  for (const item of value) {
    const record = as_record(item)
    const label = as_string(record?.['label'])
    const amount = as_finite_number(record?.['amount'])
    const endMonth = as_optional_month(record?.['endMonth'])
    const month = as_optional_month(record?.['month'])
    if (!record || label === null || amount === null || endMonth === null || month === null) {
      return null
    }
    const personId = record['personId']
    if (withPerson && personId !== undefined && personId !== null && typeof personId !== 'string') {
      return null
    }
    lines.push({
      label,
      amount,
      ...(withPerson && personId !== undefined ? { personId: personId as string | null } : {}),
      ...(!withPerson && endMonth ? { endMonth } : {}),
      ...(month ? { month } : {})
    })
  }
  return lines
}

const parse_repayment_plan_snapshot = (value: unknown): RepaymentPlanSnapshot | null => {
  const plan = as_record(value)
  if (!plan) return null
  if (plan['kind'] !== 'repayment_plan' && plan['kind'] !== 'social_cohesion_protocol') return null
  const tenantReference = as_string(plan['tenantReference'])
  const clientReference = as_string(plan['clientReference'])
  const address = as_record(plan['address'])
  const addressLine = as_string(address?.['line'])
  const postalCode = as_string(address?.['postalCode'])
  const city = as_string(address?.['city'])
  const idLot = as_string(address?.['idLot'])
  const debt = as_record(plan['debt'])
  const debtAmount = as_finite_number(debt?.['amount'])
  const firstMissedPaymentDate = as_optional_date(debt?.['firstMissedPaymentDate'])
  const procedureStage = as_string(debt?.['procedureStage'])
  const procedureStageDate = as_string(debt?.['procedureStageDate'])
  if (
    tenantReference === null ||
    clientReference === null ||
    !address ||
    addressLine === null ||
    postalCode === null ||
    city === null ||
    idLot === null ||
    !debt ||
    debtAmount === null ||
    firstMissedPaymentDate === null ||
    procedureStage === null ||
    (procedureStage !== '' && !(PROCEDURE_STAGES as readonly string[]).includes(procedureStage)) ||
    procedureStageDate === null ||
    (procedureStageDate !== '' && !DATE_PATTERN.test(procedureStageDate))
  ) {
    return null
  }

  const procedures = as_record(plan['procedures'])
  const banqueDeFrance = as_record(procedures?.['banqueDeFrance'])
  const banqueDeFranceStatus = banqueDeFrance?.['status']
  const moratoriumEndDate = as_optional_date(banqueDeFrance?.['moratoriumEndDate'])
  const ccapexDate = as_string(procedures?.['ccapexDate'])
  const ctesiDate = as_string(procedures?.['ctesiDate'])
  if (
    !procedures ||
    !banqueDeFrance ||
    !['none', 'admissible_pending', 'repayment_plan_active', 'prp', 'moratorium'].includes(
      String(banqueDeFranceStatus)
    ) ||
    moratoriumEndDate === null ||
    ccapexDate === null ||
    (ccapexDate !== '' && !DATE_PATTERN.test(ccapexDate)) ||
    ctesiDate === null ||
    (ctesiDate !== '' && !DATE_PATTERN.test(ctesiDate))
  ) {
    return null
  }

  const socialWorkerValue = plan['socialWorker']
  const socialWorker = socialWorkerValue === null ? null : as_record(socialWorkerValue)
  const socialWorkerName = socialWorker ? as_string(socialWorker['name']) : null
  const socialWorkerOrganization = socialWorker ? as_string(socialWorker['organization']) : null
  const socialWorkerContact = socialWorker ? as_string(socialWorker['contact']) : null
  const socialWorkerLastContactDate = socialWorker
    ? as_string(socialWorker['lastContactDate'])
    : null
  if (
    socialWorkerValue !== null &&
    (!socialWorker ||
      socialWorkerName === null ||
      socialWorkerOrganization === null ||
      socialWorkerContact === null ||
      socialWorkerLastContactDate === null ||
      (socialWorkerLastContactDate !== '' && !DATE_PATTERN.test(socialWorkerLastContactDate)))
  ) {
    return null
  }

  const household = as_record(plan['household'])
  const amendmentSigned = plan['amendmentSigned']
  const tenantVisitedAtHome = plan['tenantVisitedAtHome']
  const noticeDate = as_string(plan['noticeDate'])
  if (
    !household ||
    !Array.isArray(household['adults']) ||
    !Array.isArray(household['children']) ||
    typeof amendmentSigned !== 'boolean' ||
    typeof tenantVisitedAtHome !== 'boolean' ||
    noticeDate === null ||
    (noticeDate !== '' && !DATE_PATTERN.test(noticeDate))
  ) {
    return null
  }
  const adults: RepaymentPlanSnapshot['household']['adults'] = []
  for (const item of household['adults']) {
    const adult = as_record(item)
    const id = as_non_empty_string(adult?.['id'])
    const lastName = as_string(adult?.['lastName'])
    const firstName = as_string(adult?.['firstName'])
    const birthDate = as_string(adult?.['birthDate'])
    const employmentStatus = adult?.['employmentStatus']
    const employer = as_string(adult?.['employer'])
    const cafNumber = as_string(adult?.['cafNumber'])
    if (
      !adult ||
      !id ||
      lastName === null ||
      firstName === null ||
      birthDate === null ||
      (birthDate !== '' && !DATE_PATTERN.test(birthDate)) ||
      !(REPAYMENT_PLAN_EMPLOYMENT_STATUSES as readonly unknown[]).includes(employmentStatus) ||
      employer === null ||
      cafNumber === null ||
      typeof adult['leaseHolder'] !== 'boolean' ||
      typeof adult['occupant'] !== 'boolean'
    ) {
      return null
    }
    adults.push({
      id,
      lastName: lastName,
      firstName: firstName,
      birthDate: birthDate,
      employmentStatus: employmentStatus as RepaymentPlanEmploymentStatus,
      employer,
      cafNumber: cafNumber,
      leaseHolder: adult['leaseHolder'],
      occupant: adult['occupant']
    })
  }
  const children: RepaymentPlanSnapshot['household']['children'] = []
  for (const item of household['children']) {
    const child = as_record(item)
    const id = as_non_empty_string(child?.['id'])
    const lastName = as_string(child?.['lastName'])
    const firstName = as_string(child?.['firstName'])
    const birthDate = as_string(child?.['birthDate'])
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
      lastName: lastName,
      firstName: firstName,
      birthDate: birthDate,
      dependent: child['dependent']
    })
  }

  const budget = as_record(plan['budget'])
  const income = parse_amount_lines(budget?.['income'], true)
  const expenses = parse_amount_lines(budget?.['expenses'], false)
  if (!budget || !income || !expenses) return null
  if (
    !Array.isArray(plan['requestedAids']) ||
    !plan['requestedAids'].every((item) => typeof item === 'string')
  ) {
    return null
  }
  if (!Array.isArray(plan['installments'])) return null
  const installments: RepaymentPlanSnapshot['installments'] = []
  for (const item of plan['installments']) {
    const installment = as_record(item)
    const date = as_string(installment?.['date'])
    const amount = as_finite_number(installment?.['amount'])
    if (!installment || !date || !DATE_PATTERN.test(date) || amount === null) {
      return null
    }
    installments.push({ date, amount })
  }

  return {
    kind: plan['kind'],
    tenantReference: tenantReference,
    clientReference: clientReference,
    address: { line: addressLine, postalCode: postalCode, city, idLot: idLot },
    debt: {
      amount: debtAmount,
      ...(firstMissedPaymentDate ? { firstMissedPaymentDate: firstMissedPaymentDate } : {}),
      procedureStage: procedureStage as ProcedureStage | '',
      procedureStageDate: procedureStageDate
    },
    procedures: {
      banqueDeFrance: {
        status:
          banqueDeFranceStatus as RepaymentPlanSnapshot['procedures']['banqueDeFrance']['status'],
        ...(moratoriumEndDate ? { moratoriumEndDate: moratoriumEndDate } : {})
      },
      ccapexDate: ccapexDate,
      ctesiDate: ctesiDate
    },
    socialWorker: socialWorker
      ? {
          name: socialWorkerName!,
          organization: socialWorkerOrganization!,
          contact: socialWorkerContact!,
          lastContactDate: socialWorkerLastContactDate!
        }
      : null,
    amendmentSigned: amendmentSigned,
    noticeDate: noticeDate,
    tenantVisitedAtHome: tenantVisitedAtHome,
    household: { adults, children },
    budget: { income, expenses },
    requestedAids: [...plan['requestedAids']],
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
