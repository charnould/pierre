import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { CARL_TAG, fetchReleases, tagsDescending } from '../lib/github.ts'
import { actionScreen, renderChoiceLine, renderDetailLine, renderHintLine } from '../lib/output.ts'
import type { Context } from '../lib/system.ts'
import { choose, clearUi, enterUi, leaveUi, pauseDashboard, sayError } from '../lib/tui.ts'
import { installModel } from './install.ts'
import { restart } from './restart.ts'

function currentCarl(ctx: Context): string {
  const file = join(ctx.runtime.paths.home, 'models', 'carl', 'version')
  if (!existsSync(file)) return ''
  return readFileSync(file, 'utf8').replace(/\s+/g, '')
}

async function publishedTags(ctx: Context): Promise<string[] | null> {
  const releases = await fetchReleases(ctx)
  if (releases.length === 0) return null
  const tags = tagsDescending(
    releases.map((release) => release.tag),
    CARL_TAG
  )
  return tags.length > 0 ? tags : null
}

function screen(ctx: Context, title: string) {
  clearUi(ctx.runtime)
  ctx.runtime.writeOut(actionScreen(ctx, title))
}

async function installCarl(ctx: Context, choice: string): Promise<number> {
  const current = currentCarl(ctx)
  const tags = await publishedTags(ctx)
  if (!tags) {
    sayError(ctx, 'Les versions publiées sont indisponibles.')
    return 1
  }
  let selected = choice
  if (!selected) {
    if (!ctx.runtime.canPrompt) {
      sayError(ctx, 'Il faut un terminal.')
      return 1
    }
    ctx.runtime.writeOut(`Installée : ${current || 'aucune'}\n\n${tags.join('\n')}\n`)
    ctx.runtime.writeOut(`Version${current ? ` [${current}]` : ''} : `)
    selected = (await ctx.runtime.readLine()) || current
  }
  if (!CARL_TAG.test(selected) || !tags.includes(selected)) {
    sayError(ctx, 'Version inconnue.')
    return 1
  }
  const model = join(ctx.runtime.paths.home, 'models', 'carl', 'model.onnx')
  if (current === selected && existsSync(model)) {
    ctx.runtime.writeOut(`carl ${selected} : déjà en place\n`)
    return 0
  }
  try {
    await installModel(ctx, selected)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'L’installation a échoué.'
    sayError(ctx, message)
    return 1
  }
  return restart(ctx)
}

export async function carlMenu(ctx: Context): Promise<number> {
  const ownUi = !ctx.runtime.uiActive
  if (ownUi) enterUi(ctx.runtime)
  try {
    screen(ctx, 'Mettre à jour carl')
    ctx.runtime.writeOut(
      `  ${ctx.runtime.palette.dim}Recherche des versions disponibles…${ctx.runtime.palette.reset}\n`
    )
    const tags = await publishedTags(ctx)
    if (!tags) {
      screen(ctx, 'Mettre à jour carl')
      ctx.runtime.writeOut(
        `  ${ctx.runtime.palette.red}Impossible de récupérer les versions disponibles.${ctx.runtime.palette.reset}\n`
      )
      ctx.runtime.writeOut('  Vérifiez la connexion réseau, puis réessayez.\n')
      await pauseDashboard(ctx)
      return 1
    }
    const current = currentCarl(ctx)
    const initial = Math.max(0, tags.indexOf(current))
    const selected = await choose(
      ctx,
      tags.length,
      (index) => {
        const { green, yellow, reset } = ctx.runtime.palette
        screen(ctx, 'Mettre à jour carl')
        ctx.runtime.writeOut(renderDetailLine(ctx, 'Version installée', current || 'aucune'))
        ctx.runtime.writeOut('\n')
        tags.forEach((tag, tagIndex) => {
          const row = renderChoiceLine(ctx, tag.padEnd(18), tagIndex === index).slice(0, -1)
          const mark = tag === current ? ` ${green}installée${reset}` : ''
          ctx.runtime.writeOut(`${row}${mark}\n`)
        })
        ctx.runtime.writeOut('\n  carl classe automatiquement les messages des locataires.\n')
        ctx.runtime.writeOut(
          `  ${yellow}Changer de version peut modifier les qualifications futures.${reset}\n`
        )
        ctx.runtime.writeOut('  Les qualifications déjà enregistrées ne seront pas modifiées.\n')
        ctx.runtime.writeOut('\n')
        ctx.runtime.writeOut(renderHintLine(ctx, '↑↓ naviguer · ↵ installer · ← retour'))
      },
      initial
    )
    if (selected === null) return 0
    const choice = tags[selected] ?? ''
    return applyMenuChoice(ctx, choice, current)
  } finally {
    if (ownUi) leaveUi(ctx.runtime)
  }
}

async function applyMenuChoice(ctx: Context, tag: string, current: string): Promise<number> {
  const { green, red, reset } = ctx.runtime.palette
  screen(ctx, 'Mettre à jour carl')
  ctx.runtime.writeOut(renderDetailLine(ctx, 'Version choisie', tag))
  ctx.runtime.writeOut('  PIERRE redémarrera pour charger le modèle.\n\n')
  const model = join(ctx.runtime.paths.home, 'models', 'carl', 'model.onnx')
  if (tag === current && existsSync(model)) {
    ctx.runtime.writeOut(`  ${green}carl ${tag} est déjà à jour.${reset}\n`)
    await pauseDashboard(ctx)
    return 0
  }
  try {
    await installModel(ctx, tag)
    const code = await restart(ctx)
    if (code === 0)
      ctx.runtime.writeOut(`\n  ${green}carl ${tag} est installé et opérationnel.${reset}\n`)
    else ctx.runtime.writeOut(`\n  ${red}L’installation a échoué.${reset}\n`)
    await pauseDashboard(ctx)
    return code
  } catch {
    ctx.runtime.writeOut(`\n  ${red}L’installation a échoué.${reset}\n`)
    await pauseDashboard(ctx)
    return 1
  }
}

export async function carl(ctx: Context, argument = ''): Promise<number> {
  if (!argument && ctx.runtime.tty && ctx.runtime.canPrompt) return carlMenu(ctx)
  return installCarl(ctx, argument)
}
