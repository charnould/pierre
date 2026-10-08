export function formatActivityNotificationTime(iso: string): string {
  const date = new Date(iso)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}h${minutes}`
}

export function formatActivityNotificationDateline(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  return `${formatActivityNotificationTime(iso)} · ${day}`
}

/** Inspector timeline: date first, then clock. Activity keeps `HHhMM · JJ/MM/AAAA`. */
export function formatInspectorTimelineDateline(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  return `${day} · ${formatActivityNotificationTime(iso)}`
}
