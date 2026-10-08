export function jsonSyntaxError(text: string): string | null {
  try {
    JSON.parse(text)
    return null
  } catch {
    return 'JSON invalide.'
  }
}

export const TICKETS_JSON_EXAMPLE = `{
  "buckets": [{ "id": "non_traitees", "label": "Réclamations" }],
  "actions": { "dossier": ["Analyser le dossier"] },
  "tags": ["Urgent"]
}`
