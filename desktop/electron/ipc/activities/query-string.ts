import type { GetActivitiesParams } from '../../../src/shared/types/activites'

export function activityQueryString(params: GetActivitiesParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key === 'url' || value === undefined || value === false) continue
    search.set(key, Array.isArray(value) ? value.join(',') : String(value))
  }
  return search.toString()
}
