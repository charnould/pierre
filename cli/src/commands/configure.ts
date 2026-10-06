import { chmodSync, copyFileSync, existsSync, rmSync } from 'node:fs'

import {
  formatEnv,
  installationComplete,
  readEnvValue,
  writePrivate,
  type ParsedEnv
} from '../lib/config.ts'
import { actionScreen } from '../lib/output.ts'
import { runCommand, waitForBody, type Context } from '../lib/system.ts'
import { clearUi, enterUi, leaveUi, pauseDashboard, sayError } from '../lib/tui.ts'
import {
  collectDotenv,
  finalizeConfiguration,
  rollbackInstallation,
  writeCaddy
} from './install.ts'

const interactiveInput = (ctx: Context) =>
  ctx.runtime.canPrompt && ctx.runtime.stdinTTY && ctx.runtime.env['PIERRE_ENV_STDIN'] !== '1'

function screen(ctx: Context, title: string) {
  if (ctx.runtime.tty || ctx.runtime.uiActive) {
    clearUi(ctx.runtime)
    ctx.runtime.writeOut(actionScreen(ctx, title))
    return
  }
  ctx.runtime.writeOut(`${title}\n\n`)
}

async function applyConfiguration(
  ctx: Context,
  env: ParsedEnv,
  originalHost: string
): Promise<boolean> {
  const { envFile, pendingEnvFile, previousEnvFile, caddyFile, previousCaddyFile } =
    ctx.runtime.paths
  try {
    rmSync(previousEnvFile, { force: true })
    rmSync(previousCaddyFile, { force: true })
    copyFileSync(envFile, previousEnvFile)
    chmodSync(previousEnvFile, 0o600)
    if (existsSync(caddyFile)) copyFileSync(caddyFile, previousCaddyFile)
  } catch {
    return false
  }
  try {
    copyFileSync(pendingEnvFile, envFile)
    chmodSync(envFile, 0o600)
    if (env.host !== originalHost) await writeCaddy(ctx, env.host)
    const restarted = await runCommand(ctx.runtime, 'systemctl', ['restart', 'pierre'])
    if (restarted.code !== 0) throw new Error('restart')
    if (!(await waitForBody(ctx.runtime, 'http://127.0.0.1:3000/up', 120))) throw new Error('local')
    if (!(await waitForBody(ctx.runtime, `https://${env.host}/up`, 120))) throw new Error('public')
    finalizeConfiguration(ctx)
    return true
  } catch {
    await rollbackInstallation(ctx)
    return false
  }
}

async function configurationSuccess(ctx: Context, env: ParsedEnv, secretChanged: boolean) {
  const { cyan, yellow, reset } = ctx.runtime.palette
  screen(ctx, 'Configuration appliquée')
  ctx.runtime.writeOut(`  PIERRE a redémarré et répond sur ${cyan}https://${env.host}${reset}\n\n`)
  if (secretChanged) {
    ctx.runtime.writeOut(`  ${yellow}Le secret webhook CM.com a changé.${reset}\n\n`)
    ctx.runtime.writeOut('  Header : Webhook-Secret\n')
    ctx.runtime.writeOut(`  Nouvelle valeur : ${env.cmWebhookSecret}\n\n`)
    ctx.runtime.writeOut('  Mettez à jour cette valeur dans CM.com avant de quitter cet écran.\n')
  } else if (!env.cmProductToken) {
    ctx.runtime.writeOut(
      `  ${yellow}CM.com est désactivé : RCS et SMS sont indisponibles.${reset}\n`
    )
  } else {
    ctx.runtime.writeOut(`  CM.com reste configuré avec l’expéditeur ${env.cmFrom}.\n`)
  }
  await pauseDashboard(ctx)
}

async function configurationFailed(ctx: Context) {
  screen(ctx, 'Configuration non appliquée')
  ctx.runtime.writeOut('  La nouvelle configuration n’a pas pu être activée.\n')
  ctx.runtime.writeOut('  L’environnement précédent a été restauré et PIERRE a redémarré.\n\n')
  ctx.runtime.writeOut(
    `  Vos modifications restent dans ${ctx.runtime.paths.pendingEnvFile} pour un nouvel essai.\n`
  )
  await pauseDashboard(ctx)
}

export async function configure(ctx: Context): Promise<number> {
  if (!installationComplete(ctx.runtime)) {
    sayError(ctx, 'PIERRE doit être installé avant de pouvoir le configurer.')
    return 1
  }
  const originalHost = readEnvValue(ctx.runtime.paths.envFile, 'HOST')
  const previousSecret = readEnvValue(ctx.runtime.paths.envFile, 'CM_WEBHOOK_SECRET')
  const ownUi = interactiveInput(ctx) && !ctx.runtime.uiActive
  if (ownUi) enterUi(ctx.runtime)
  try {
    const collected = await collectDotenv(ctx, 'configure')
    if (collected.action !== 'apply' || !collected.env) return 1
    const secretChanged =
      collected.env.cmWebhookSecret !== '' && collected.env.cmWebhookSecret !== previousSecret
    writePrivate(ctx.runtime.paths.pendingEnvFile, formatEnv(collected.env))
    if (await applyConfiguration(ctx, collected.env, originalHost)) {
      if (interactiveInput(ctx)) await configurationSuccess(ctx, collected.env, secretChanged)
      else ctx.runtime.writeOut('Configuration appliquée.\n')
      return 0
    }
    if (interactiveInput(ctx)) await configurationFailed(ctx)
    else sayError(ctx, 'Configuration non appliquée ; les valeurs précédentes ont été restaurées.')
    return 1
  } finally {
    if (ownUi) leaveUi(ctx.runtime)
  }
}
