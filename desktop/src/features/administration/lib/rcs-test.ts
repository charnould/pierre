import type { ActivityContext, ActivityListItem } from '@/shared/types/activites'

function channelLine(items: ActivityListItem[], channel: 'rcs' | 'sms'): string | null {
  const sent = items.some((item) => item.type === 'communication.sent' && item.channel === channel)
  if (!sent) return null
  const name = channel === 'rcs' ? 'RCS' : 'SMS'
  if (items.some((item) => item.type === 'communication.ok' && item.channel === channel)) {
    return `${name} envoyé, webhook ok`
  }
  if (items.some((item) => item.type === 'communication.failed' && item.channel === channel)) {
    return `${name} envoyé, webhook échec`
  }
  return `${name} envoyé`
}

function rcsReply(items: ActivityListItem[]): 'Oui' | 'Non' | null {
  for (const item of items) {
    if (item.type !== 'communication.received') continue
    if (item.contenu.includes('« Oui »')) return 'Oui'
    if (item.contenu.includes('« Non »')) return 'Non'
  }
  return null
}

export function rcsTestReport(items: ActivityListItem[]): { text: string; done: boolean } {
  const reply = rcsReply(items)
  const lines = [channelLine(items, 'rcs'), channelLine(items, 'sms')]
  if (reply) lines.push(`Réponse : ${reply}`)
  return { text: lines.filter((line) => line != null).join(' · '), done: reply != null }
}

export async function followRcsTest(params: {
  url: string
  contexte: ActivityContext
  ref: string
  isCurrent: () => boolean
  onStatus: (text: string) => void
}): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    if (!params.isCurrent()) return
    const listed = await window.api?.getActivities?.({
      url: params.url,
      contexte: params.contexte,
      ref: params.ref,
      limit: 20
    })
    const report = rcsTestReport(listed?.data ?? [])
    params.onStatus(report.text || 'RCS envoyé')
    if (report.done) return
  }
  if (!params.isCurrent()) return
  params.onStatus('Aucune réponse reçue')
}
