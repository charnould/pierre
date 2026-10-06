import type { Context, Runtime } from './system.ts'

export const MAIN_MENU = [
  { action: 'logs', label: 'Consulter les journaux' },
  { action: 'backup', label: 'Sauvegarder les données' },
  { action: 'restart', label: 'Redémarrer PIERRE (serveur)' },
  { action: 'update', label: 'Mettre à jour PIERRE (serveur)' },
  { action: 'update-cli', label: 'Mettre à jour le cli' },
  { action: 'carl', label: 'Mettre à jour carl (classification)' },
  { action: 'configure', label: 'Configurer PIERRE (serveur)' },
  { action: 'remove', label: 'Tout désinstaller' },
  { action: 'quit', label: 'Quitter' }
] as const

export type MenuAction = (typeof MAIN_MENU)[number]['action']

export function moveSelection(selected: number, count: number, direction: 'up' | 'down'): number {
  if (direction === 'up') return (selected + count - 1) % count
  return (selected + 1) % count
}

export function enterUi(runtime: Runtime) {
  if (runtime.uiActive) return
  runtime.writeOut('\u001b[?1049h\u001b[?25l')
  runtime.uiActive = true
}

export function leaveUi(runtime: Runtime) {
  if (!runtime.uiActive) return
  runtime.writeOut('\u001b[?25h\u001b[?1049l')
  runtime.uiActive = false
}

export function clearUi(runtime: Runtime) {
  runtime.writeOut('\u001b[2J\u001b[H')
}

export function say(ctx: Context, text: string) {
  ctx.runtime.writeOut(`${ctx.runtime.uiActive ? '  ' : ''}${text}\n`)
}

export function sayError(ctx: Context, text: string) {
  ctx.runtime.writeErr(`${ctx.runtime.uiActive ? '  ' : ''}${text}\n`)
}

export async function confirm(ctx: Context, prompt: string): Promise<0 | 1 | 2> {
  if (!ctx.runtime.canPrompt) {
    sayError(ctx, "Confirmation impossible hors d'un terminal.")
    return 2
  }
  const margin = ctx.runtime.uiActive ? '  ' : ''
  ctx.runtime.writeOut(`${margin}${prompt} [o/N] : `)
  const reply = await ctx.runtime.readLine()
  if (reply === null) return 2
  return reply === 'o' || reply === 'O' || reply === 'oui' ? 0 : 1
}

export async function pauseDashboard(ctx: Context) {
  if (!ctx.runtime.canPrompt) return
  const { dim, reset } = ctx.runtime.palette
  ctx.runtime.writeOut(`\n  ${dim}Appuyez sur Entrée pour revenir${reset}`)
  await ctx.runtime.readLine()
}

export async function choose(
  ctx: Context,
  count: number,
  render: (selected: number) => void,
  initial = 0
): Promise<number | null> {
  let selected = initial >= 0 && initial < count ? initial : 0
  while (true) {
    render(selected)
    const key = await ctx.runtime.readKey()
    if (key === null || key === 'back' || key === 'quit') return null
    if (key === 'up' || key === 'down') selected = moveSelection(selected, count, key)
    if (key === 'enter') return selected
  }
}

export function menuAction(index: number): MenuAction {
  return MAIN_MENU[index]?.action ?? 'quit'
}
