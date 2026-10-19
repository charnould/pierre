import type { Context } from './system.ts'

export function say(ctx: Context, text: string) {
  ctx.runtime.writeOut(`${text}\n`)
}

export function sayError(ctx: Context, text: string) {
  ctx.runtime.writeErr(`${text}\n`)
}

export function done(ctx: Context, text: string) {
  const { green, reset } = ctx.runtime.palette
  say(ctx, `  ${green}■${reset}  ${text}`)
}

export function failed(ctx: Context, text: string) {
  const { red, reset } = ctx.runtime.palette
  sayError(ctx, `  ${red}■${reset}  ${text}`)
}

export async function spin<T>(ctx: Context, label: string, action: () => Promise<T>): Promise<T> {
  const { cyan, green, red, reset } = ctx.runtime.palette
  let timer: ReturnType<typeof setInterval> | undefined
  let live = true
  if (ctx.runtime.tty) {
    const frames = ['◐', '◓', '◑', '◒']
    let frame = 0
    timer = setInterval(() => {
      if (!live) return
      const glyph = frames[frame % frames.length] ?? '◐'
      frame += 1
      ctx.runtime.writeOut(`\r\u001b[2K  ${cyan}${glyph}${reset}  ${label}`)
    }, 120)
  }
  const stop = () => {
    live = false
    if (timer) clearInterval(timer)
  }
  try {
    const value = await action()
    stop()
    ctx.runtime.writeOut(`${ctx.runtime.tty ? '\r\u001b[2K' : ''}  ${green}■${reset}  ${label}\n`)
    return value
  } catch (error) {
    stop()
    ctx.runtime.writeOut(`${ctx.runtime.tty ? '\r\u001b[2K' : ''}  ${red}■${reset}  ${label}\n`)
    throw error
  }
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
