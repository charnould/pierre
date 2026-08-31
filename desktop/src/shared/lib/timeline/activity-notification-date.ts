const DAY_MS = 1000 * 60 * 60 * 24

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatTimeShort(date: Date): string {
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${date.getHours()}h${minutes}`
}

export function formatActivityNotificationTime(iso: string): string {
  const date = new Date(iso)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}h${minutes}`
}

export function formatActivityNotificationAbsolute(iso: string): string {
  const date = new Date(iso)
  const day = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  return `${day} à ${formatTimeShort(date)}`
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

export function formatActivityNotificationRelative(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS)

  if (diffDays === 0) {
    if (diffMins < 1) return "à l'instant"
    if (diffMins < 60) return `il y a ${diffMins} min`
    return `il y a ${diffHours} h`
  }
  if (diffDays === 1) return `hier · ${formatTimeShort(date)}`
  if (diffDays > 1 && diffDays < 7) return `il y a ${diffDays} jours`

  return formatActivityNotificationAbsolute(iso)
}
