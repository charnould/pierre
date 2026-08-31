/** Date affichée dans la liste et le lecteur Updates — format unique. */
export function formatUpdateDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
