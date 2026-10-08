export function jsonSyntaxError(text: string): string | null {
  try {
    JSON.parse(text)
    return null
  } catch {
    return 'JSON invalide.'
  }
}

function stringList(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => typeof entry === 'string' && entry.trim().length > 0)
  )
}

/** Garde un JSON de réclamations déjà valide. Sinon, l’exemple que gx accepte. */
export function ticketsConfigOrExample(text: string): string {
  if (jsonSyntaxError(text)) return TICKETS_JSON_EXAMPLE
  const root = JSON.parse(text) as {
    buckets?: unknown
    actions?: unknown
    tags?: unknown
    prompt?: unknown
  }
  if (root == null || typeof root !== 'object' || Array.isArray(root) || 'prompt' in root) {
    return TICKETS_JSON_EXAMPLE
  }
  const buckets = Array.isArray(root.buckets) ? root.buckets : []
  const ids = buckets.flatMap((entry) => {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) return []
    const id = (entry as { id?: unknown }).id
    return typeof id === 'string' ? [id] : []
  })
  const actions = root.actions
  const dossier =
    actions != null && typeof actions === 'object' && !Array.isArray(actions)
      ? (actions as { dossier?: unknown }).dossier
      : undefined
  if (!ids.includes('non_traitees') || !stringList(dossier) || !stringList(root.tags)) {
    return TICKETS_JSON_EXAMPLE
  }
  return text
}

export const TICKETS_JSON_EXAMPLE = `{
  "buckets": [{ "id": "non_traitees", "label": "Réclamations" }],
  "actions": { "dossier": ["Analyser le dossier"] },
  "tags": ["Urgent"]
}`
