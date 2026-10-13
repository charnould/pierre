import type { Context } from './system.ts'

export function say(ctx: Context, text: string) {
  ctx.runtime.writeOut(`${text}\n`)
}

export function sayError(ctx: Context, text: string) {
  ctx.runtime.writeErr(`${text}\n`)
}

export async function confirm(ctx: Context, prompt: string): Promise<0 | 1 | 2> {
  if (!ctx.runtime.canPrompt) {
    sayError(ctx, "Confirmation impossible hors d'un terminal.")
    return 2
  }
  ctx.runtime.writeOut(`${prompt} [o/N] : `)
  const reply = await ctx.runtime.readLine()
  if (reply === null) return 2
  return reply === 'o' || reply === 'O' || reply === 'oui' ? 0 : 1
}
