import { computeInstallmentBudget } from './calculations'
import {
  addMonths,
  formatInstallmentDate,
  formatMonthDisplay,
  sumInstallments
} from './installments'
import { formatAmountSplit, formatEffortRate, formatMoneyDisplay, formatUnits } from './money'
import {
  BANQUE_DE_FRANCE_STATUS_LABELS,
  CREDIT_EXPENSE_PRESET,
  EMPLOYMENT_STATUS_LABELS,
  PLAN_TYPE_LABELS,
  PROCEDURE_STAGE_LABELS,
  type AdultMember,
  type RepaymentPlanForm
} from './types'

/** Montant FR sans symbole monétaire (`1 234,56`) — le template ajoute parfois `€`. */
export function formatMoneyPlain(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

function formatDateLongue(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function formatDateIsoFr(iso: string): string {
  if (!iso) return '—'
  const date = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return '—'
  return formatDateShort(date)
}

function personName(firstName: string, lastName: string, fallback: string): string {
  const name = `${firstName.trim()} ${lastName.trim()}`.trim()
  return name || fallback
}

function yesNo(value: boolean, style: 'lower' | 'title' = 'lower'): string {
  if (style === 'title') return value ? 'Oui' : 'Non'
  return value ? 'oui' : 'non'
}

export function resolveLeaseHolders(adults: AdultMember[]): AdultMember[] {
  const holders = adults.filter((adult) => adult.isLeaseHolder)
  if (holders.length > 0) return holders
  return adults[0] ? [adults[0]] : []
}

function resolvePersonLabel(
  personId: string | null,
  form: RepaymentPlanForm,
  fallbackIndex: number
): string {
  if (!personId) return 'Foyer'
  const adult = form.household.adults.find((member) => member.id === personId)
  if (adult) {
    const index = form.household.adults.indexOf(adult)
    return personName(adult.firstName, adult.lastName, `Adulte ${index + 1}`)
  }
  const child = form.household.children.find((member) => member.id === personId)
  if (child) {
    const index = form.household.children.indexOf(child)
    return personName(child.firstName, child.lastName, `Enfant ${index + 1}`)
  }
  return `Personne ${fallbackIndex + 1}`
}

function formatBanqueDeFrance(form: RepaymentPlanForm): string {
  const label = BANQUE_DE_FRANCE_STATUS_LABELS[form.banqueDeFranceStatus]
  if (form.banqueDeFranceStatus !== 'moratorium') return label
  if (!form.moratoriumEndDate) return label
  return `${label} — fin le ${formatDateIsoFr(form.moratoriumEndDate)}`
}

export type PlanDocxContext = {
  id_locataire: string
  id_client: string
  email: string
}

export type PlanDocxData = {
  EMAIL: string
  DATE: string
  TYPE_PLAN: string
  DETTE: string
  ADRESSE: string
  CODE_POSTAL: string
  VILLE: string
  ID_CLIENT: string
  ID_LOCATAIRE: string
  ID_LOT: string
  TOTAL_PLAN: string
  PREMIER_IMPAYE: string
  STADE: string
  CCAPEX: string
  CTESI: string
  TRAVAILLEUR_SOCIAL: string
  BANQUE_DE_FRANCE: string
  TOTAL_RESSOURCES: string
  TOTAL_CHARGES: string
  AVENANT: string
  CONGE: string
  CLAUSE_SOLIDARITE: string
  TITULAIRES: Array<{ PRENOM: string; NOM: string; CAF: string }>
  ECHEANCES: Array<{
    NUMERO: string
    ECHEANCE: string
    MONTANT: string
    RESSOURCES_MOIS: string
    CHARGES_MOIS: string
    UC: string
    RESTE_COMPLET: string
    TAUX_COMPLET: string
    RESTE_SIMPLIFIE: string
    TAUX_SIMPLIFIE: string
  }>
  ADULTES: Array<{
    PRENOM: string
    NOM: string
    DATE_NAISSANCE: string
    STATUT_PRO: string
    EMPLOYEUR: string
    CAF: string
    TITULAIRE: string
    OCCUPANT: string
  }>
  ENFANTS: Array<{
    PRENOM: string
    NOM: string
    DATE_NAISSANCE: string
    A_CHARGE: string
  }>
  RESSOURCES: Array<{ TYPE: string; PERSONNE: string; MONTANT: string }>
  CHARGES: Array<{ TYPE: string; MONTANT: string }>
  AIDES: Array<{ LABEL: string }>
}

export function buildPlanDocxData(
  form: RepaymentPlanForm,
  ctx: PlanDocxContext,
  now: Date = new Date()
): PlanDocxData {
  const planTotal =
    form.installments.length > 0 ? formatMoneyPlain(sumInstallments(form.installments)) : '—'
  const totalIncome = form.income.reduce((sum, line) => sum + line.amount, 0)
  const totalExpenses = form.expenses.reduce((sum, line) => sum + line.amount, 0)

  const socialWorker = form.hasSocialWorker
    ? [
        form.socialWorkerName.trim(),
        form.socialWorkerOrganization.trim(),
        form.socialWorkerContact.trim(),
        form.socialWorkerLastContactDate
          ? `dernier contact le ${formatDateIsoFr(form.socialWorkerLastContactDate)}`
          : ''
      ]
        .filter(Boolean)
        .join(' — ') || 'oui'
    : 'non'

  return {
    EMAIL: ctx.email.trim(),
    DATE: formatDateLongue(now),
    TYPE_PLAN: PLAN_TYPE_LABELS[form.planType],
    DETTE: formatMoneyPlain(form.rentalDebt),
    ADRESSE: form.address.trim(),
    CODE_POSTAL: form.postalCode.trim(),
    VILLE: form.city.trim(),
    ID_CLIENT: ctx.id_client.trim(),
    ID_LOCATAIRE: ctx.id_locataire.trim(),
    ID_LOT: form.idLot.trim(),
    TOTAL_PLAN: planTotal,
    PREMIER_IMPAYE: form.firstMissedPaymentDate
      ? formatDateIsoFr(form.firstMissedPaymentDate)
      : 'non renseignée',
    STADE: form.procedureStage
      ? form.procedureStageDate
        ? `${PROCEDURE_STAGE_LABELS[form.procedureStage]} le ${formatDateIsoFr(form.procedureStageDate)}`
        : PROCEDURE_STAGE_LABELS[form.procedureStage]
      : '',
    CCAPEX: form.ccapexDate ? formatDateIsoFr(form.ccapexDate) : 'non',
    CTESI: form.ctesiDate ? formatDateIsoFr(form.ctesiDate) : 'non',
    TRAVAILLEUR_SOCIAL: socialWorker,
    BANQUE_DE_FRANCE: formatBanqueDeFrance(form),
    TOTAL_RESSOURCES: formatMoneyPlain(totalIncome),
    TOTAL_CHARGES: formatMoneyPlain(totalExpenses),
    AVENANT: yesNo(form.amendmentSigned),
    CONGE: form.noticeDate ? formatDateIsoFr(form.noticeDate) : '',
    CLAUSE_SOLIDARITE: form.noticeDate ? formatDateIsoFr(addMonths(form.noticeDate, 6)) : '',
    TITULAIRES: resolveLeaseHolders(form.household.adults).map((adult) => ({
      PRENOM: adult.firstName.trim(),
      NOM: adult.lastName.trim(),
      CAF: adult.cafNumber.trim()
    })),
    ECHEANCES: form.installments.map((item, index) => {
      const month = computeInstallmentBudget(form, item.date, item.amount)
      const resources = formatAmountSplit(month.recurringIncome, month.punctualIncome)
      const charges = formatAmountSplit(month.recurringExpenses, month.punctualExpenses)
      return {
        NUMERO: String(index + 1),
        ECHEANCE: formatInstallmentDate(item.date),
        MONTANT: formatMoneyPlain(item.amount),
        RESSOURCES_MOIS: `${resources.total} ${resources.detail}`,
        CHARGES_MOIS: `${charges.total} ${charges.detail}`,
        UC: formatUnits(month.consumptionUnits),
        RESTE_COMPLET: formatMoneyDisplay(month.dailyRemainder),
        TAUX_COMPLET: formatEffortRate(month.effortRate),
        RESTE_SIMPLIFIE: formatMoneyDisplay(month.simplifiedDailyRemainder),
        TAUX_SIMPLIFIE: formatEffortRate(month.simplifiedEffortRate)
      }
    }),
    ADULTES: form.household.adults.map((adult) => ({
      PRENOM: adult.firstName.trim(),
      NOM: adult.lastName.trim(),
      DATE_NAISSANCE: formatDateIsoFr(adult.birthDate),
      STATUT_PRO: EMPLOYMENT_STATUS_LABELS[adult.employmentStatus],
      EMPLOYEUR: adult.employer.trim(),
      CAF: adult.cafNumber.trim() || '—',
      TITULAIRE: yesNo(adult.isLeaseHolder, 'title'),
      OCCUPANT: yesNo(adult.isOccupant, 'title')
    })),
    ENFANTS: form.household.children.map((child) => ({
      PRENOM: child.firstName.trim(),
      NOM: child.lastName.trim(),
      DATE_NAISSANCE: formatDateIsoFr(child.birthDate),
      A_CHARGE: yesNo(child.isDependent, 'title')
    })),
    RESSOURCES: form.income
      .filter((item) => item.label.trim() || item.amount > 0)
      .map((item, index) => ({
        TYPE: item.label.trim() || 'Ressource',
        PERSONNE: resolvePersonLabel(item.personId, form, index),
        MONTANT: formatMoneyPlain(item.amount)
      })),
    CHARGES: form.expenses
      .filter((item) => item.label.trim() || item.amount > 0)
      .map((item) => ({
        TYPE:
          item.label.trim() === CREDIT_EXPENSE_PRESET && item.endMonth
            ? `${CREDIT_EXPENSE_PRESET} (jusqu'au ${formatMonthDisplay(item.endMonth.slice(0, 7))})`
            : item.label.trim() || 'Charge',
        MONTANT: formatMoneyPlain(item.amount)
      })),
    AIDES: form.requestedAids
      .map((item) => item.label.trim())
      .filter(Boolean)
      .map((LABEL) => ({ LABEL }))
  }
}
