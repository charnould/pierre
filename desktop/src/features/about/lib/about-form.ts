import {
  ABOUT_SUBJECTS,
  KNOWLEDGE_SKILL,
  type AboutSubject
} from '@/features/tickets/lib/knowledge-skills'
import type { AboutNavigationState } from '@/shared/lib/navigation-snapshot'
import { formatNumericRangeLabel, normalizeNumericRange } from '@/shared/lib/range-slider'

export const ABOUT_YEAR_START = 2000
export const ABOUT_YEAR_COUNT = 30
export const ABOUT_YEAR_END = ABOUT_YEAR_START + ABOUT_YEAR_COUNT - 1

export const ABOUT_YEARS = Array.from({ length: ABOUT_YEAR_COUNT }, (_, i) =>
  String(ABOUT_YEAR_START + i)
)

export const ABOUT_SUBJECT_ENTITY: Record<AboutSubject, { label: string; placeholder: string }> = {
  locataire: { label: 'Numéro du locataire', placeholder: 'ex. LOC-187329' },
  lot: { label: 'Numéro du lot', placeholder: 'ex. LOT-0029700099' },
  programme: { label: 'Numéro du programme', placeholder: 'ex. PRG-001' }
}

export const ABOUT_OUTPUT_EMPTY = {
  title: 'Aucune synthèse',
  description: 'Complétez le formulaire à gauche, puis générez la synthèse.'
} as const

const ABOUT_SUBJECT_LABELS: Record<AboutSubject, string> = {
  locataire: 'locataire',
  lot: 'lot',
  programme: 'programme'
}

export function aboutOutputHeaderTitle(subject: AboutSubject, entityId: string): string {
  const id = entityId.trim()
  const label = ABOUT_SUBJECT_LABELS[subject]
  return id ? `Synthèse ${label} · ${id}` : `Synthèse ${label}`
}

export function aboutOutputHeaderMeta(yearFrom: string, yearTo: string): string | null {
  if (!isValidAboutYearRange(yearFrom, yearTo)) return null
  return formatNumericRangeLabel(parseAboutYear(yearFrom)!, parseAboutYear(yearTo)!)
}

export function parseAboutYear(year: string): number | null {
  const parsed = parseInt(year, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export function aboutYearRangeToSliderValues(yearFrom: string, yearTo: string): [number, number] {
  const from = parseAboutYear(yearFrom) ?? ABOUT_YEAR_START
  const to = parseAboutYear(yearTo) ?? ABOUT_YEAR_END
  return normalizeNumericRange([from, to], ABOUT_YEAR_START, ABOUT_YEAR_END)
}

export function aboutYearRangeFromSliderValues(values: readonly number[]): {
  yearFrom: string
  yearTo: string
} {
  const [from, to] = normalizeNumericRange(values, ABOUT_YEAR_START, ABOUT_YEAR_END)
  return { yearFrom: String(from), yearTo: String(to) }
}

export function isValidAboutYear(year: string): boolean {
  const parsed = parseAboutYear(year)
  if (parsed === null) return false
  return ABOUT_YEARS.includes(String(parsed))
}

export function isValidAboutYearRange(yearFrom: string, yearTo: string): boolean {
  const from = parseAboutYear(yearFrom)
  const to = parseAboutYear(yearTo)
  if (from === null || to === null) return false
  if (!isValidAboutYear(yearFrom) || !isValidAboutYear(yearTo)) return false
  return from <= to
}

export function canSubmitAboutForm(entityId: string, yearFrom: string, yearTo: string): boolean {
  return entityId.trim().length > 0 && isValidAboutYearRange(yearFrom, yearTo)
}

export function isValidAboutSubject(value: string): value is AboutSubject {
  return (ABOUT_SUBJECTS as readonly string[]).includes(value)
}

export function aboutIdSkill(_subject: AboutSubject): string {
  return KNOWLEDGE_SKILL.aboutSummary
}

export function defaultAboutFormFields(): Omit<AboutNavigationState, 'step'> {
  return {
    aboutSubject: 'locataire',
    entityId: '',
    yearFrom: String(ABOUT_YEAR_START),
    yearTo: String(ABOUT_YEAR_END),
    context: ''
  }
}

export function buildAboutNavigationState(
  step: AboutNavigationState['step'],
  fields: Omit<AboutNavigationState, 'step'>
): AboutNavigationState {
  return { step, ...fields }
}

export function shouldClearAboutOutputOnSubjectChange(
  prev: AboutSubject | null,
  next: AboutSubject,
  isOutput: boolean,
  isStreaming: boolean
): boolean {
  if (prev === null || prev === next) return false
  if (!isOutput || isStreaming) return false
  return true
}

export function aboutPrimaryActionLabel(hasOutput: boolean): string {
  return hasOutput ? 'Regénérer la synthèse' : 'Générer la synthèse'
}

export function shouldAutoOpenAboutOutputStep(
  step: AboutNavigationState['step'],
  hasAppliedSnapshot: boolean
): boolean {
  return !hasAppliedSnapshot && step === 'form'
}
