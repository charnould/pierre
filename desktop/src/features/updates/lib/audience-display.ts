export const AUDIENCE_LABELS: Record<string, string> = {
  dev: 'Technique',
  product: 'Nouveautés'
}

export function audienceLabel(audience: string): string {
  return AUDIENCE_LABELS[audience] ?? audience
}

export function audienceBadgeVariant(audience: string): 'info' | 'warning' | 'neutral' {
  if (audience === 'dev') return 'info'
  if (audience === 'product') return 'warning'
  return 'neutral'
}
