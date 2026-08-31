export const PLAN_CLOSE_MOTIFS = [
  'execution_complete',
  'non_respect',
  'remplacement_par_nouveau_plan',
  'effacement_de_dette'
] as const

export type PlanCloseMotif = (typeof PLAN_CLOSE_MOTIFS)[number]

export const PLAN_CLOSE_MOTIF_LABELS: Record<PlanCloseMotif, string> = {
  execution_complete: 'Exécution terminée',
  non_respect: 'Non-respect',
  remplacement_par_nouveau_plan: 'Remplacé par un nouveau plan',
  effacement_de_dette: 'Effacement de dette'
}

export function isPlanCloseMotif(value: string | null | undefined): value is PlanCloseMotif {
  return typeof value === 'string' && (PLAN_CLOSE_MOTIFS as readonly string[]).includes(value)
}
