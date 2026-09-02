/** Rotating status labels shown while the model is thinking (desktop + web chat). */
export const THINKING_PLACEHOLDER_ROTATE_MS = 3000

export const THINKING_PLACEHOLDER_MESSAGES = [
  'Je réfléchis…',
  'Je creuse la question…',
  'Les rouages tournent…',
  "J'analyse tout ça…",
  'Je pèse les options…',
  'Je tisse les fils…',
  "J'assemble les pièces…",
  'Je cherche la meilleure approche…',
  "Je mets de l'ordre dans tout ça…",
  'Je passe ça au crible…',
  'Je synthétise…',
  'Je retourne le problème dans tous les sens…',
  'Je fouille dans les possibilités…',
  'Je fais le tour de la question…',
  'Ça avance…',
  'Je peaufine la réponse…',
  'Je vérifie mes angles…',
  "Je prends le temps d'y réfléchir…",
  'Je démêle tout ça…',
  'Je mets les idées en ordre…',
  'Je relie les points…',
  'Je explore les pistes…',
  'Les idées se connectent…',
  'Je fais le tri…',
  'La réponse prend forme…',
  'Je trace le chemin…',
  'Je clarifie les choses…',
  'Je cherche la bonne piste…',
  'Je dénoue le fil…',
  'Je fais une dernière passe…',
  'Je rapproche les éléments…',
  'Je pousse un peu plus loin…',
  "Les pièces s'emboîtent…",
  'Je jette un œil aux détails…',
  'Je passe en revue les alternatives…'
] as const

export function pickRandomThinkingPlaceholder(exclude?: string): string {
  const pool: readonly string[] = THINKING_PLACEHOLDER_MESSAGES
  if (pool.length === 0) return 'Réflexion…'
  if (pool.length === 1) return pool[0]!

  let idx = Math.floor(Math.random() * pool.length)
  const excludeIdx = exclude ? pool.indexOf(exclude as (typeof pool)[number]) : -1
  if (idx === excludeIdx) idx = (idx + 1) % pool.length
  return pool[idx] ?? pool[0] ?? 'Réflexion…'
}
