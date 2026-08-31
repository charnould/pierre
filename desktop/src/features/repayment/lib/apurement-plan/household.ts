import type { ApurementPlanFormData } from './types'

export type HouseholdPersonOption = {
  id: string
  label: string
  kind: 'adult' | 'child'
}

function displayName(firstName: string, lastName: string, fallback: string): string {
  const name = `${firstName.trim()} ${lastName.trim()}`.trim()
  return name || fallback
}

export function listHouseholdPeople(
  household: ApurementPlanFormData['household']
): HouseholdPersonOption[] {
  const adults = household.adults.map((member, index) => ({
    id: member.id,
    label: displayName(member.firstName, member.lastName, `Adulte ${index + 1}`),
    kind: 'adult' as const
  }))
  const children = household.children.map((member, index) => ({
    id: member.id,
    label: displayName(member.firstName, member.lastName, `Enfant ${index + 1}`),
    kind: 'child' as const
  }))
  return [...adults, ...children]
}
