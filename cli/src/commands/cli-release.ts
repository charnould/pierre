import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'

import {
  checksumFor,
  commandVersion,
  expectSha256,
  fetchReleases,
  fetchTo,
  releaseParts,
  selectCliRelease,
  versionGreater
} from '../lib/github.ts'
import { withInterrupt, type Context } from '../lib/system.ts'
import { done, failed, say, spin } from '../lib/text.ts'

const CLI_ASSET = 'pierre-cli-linux-x64'

type Phase = 'ready' | 'saved' | 'replaced' | 'published'

export async function stageCliUpdate(ctx: Context): Promise<'current' | 'updated' | 'failed'> {
  await recoverInterruptedCliUpdate(ctx)
  const current = ctx.version
  const forced = ctx.runtime.env['PIERRE_CLI_TAG'] ?? ''
  if (forced && !releaseParts(forced)) {
    failed(ctx, 'La version demandée est illisible.')
    return 'failed'
  }
  let tag = forced
  if (!tag) {
    try {
      tag = selectCliRelease(await fetchReleases(ctx))?.tag ?? ''
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Impossible de connaître la dernière version du cli.'
      failed(ctx, message)
      return 'failed'
    }
  }
  if (!tag || !releaseParts(tag)) {
    failed(ctx, 'Impossible de connaître la dernière version du cli.')
    return 'failed'
  }
  if (!versionGreater(tag, current)) {
    done(ctx, `${current} est déjà à jour.`)
    return 'current'
  }
  return (await installCliRelease(ctx, tag)) === 0 ? 'updated' : 'failed'
}

export async function updateCli(ctx: Context): Promise<number> {
  const staged = await stageCliUpdate(ctx)
  return staged === 'failed' ? 1 : 0
}

export async function installCliRelease(ctx: Context, tag: string): Promise<number> {
  const cmd = ctx.runtime.paths.cmd
  await recoverInterruptedCliUpdate(ctx)
  const stage = mkdtempSync(join(dirname(cmd), '.pierre-cli-stage-'))
  const binary = join(stage, CLI_ASSET)
  const previous = `${cmd}.previous`
  const target = `${cmd}.target`
  let phase: Phase = 'ready'
  const cleanup = () => {
    rmSync(`${previous}.new`, { force: true })
    rmSync(`${cmd}.new`, { force: true })
    rmSync(target, { force: true })
    rmSync(stage, { recursive: true, force: true })
  }
  return withInterrupt(
    ctx.runtime,
    () => {
      if (phase !== 'published') undoCli(cmd, phase)
      cleanup()
    },
    async () => {
      try {
        try {
          await spin(ctx, `cli ${tag}`, async () => {
            await fetchTo(ctx, CLI_ASSET, binary, tag)
            await fetchTo(ctx, 'checksums.txt', join(stage, 'checksums.txt'), tag)
            const checksums = readFileSync(join(stage, 'checksums.txt'), 'utf8')
            await expectSha256(CLI_ASSET, binary, checksumFor(checksums, CLI_ASSET))
            chmodSync(binary, 0o755)
            if ((await commandVersion(ctx, binary)) !== tag) throw new Error('version')
          })
        } catch {
          failed(ctx, 'Le cli téléchargé est invalide. Le cli installé est inchangé.')
          return 1
        }
        writeFileSync(target, `${tag}\n`)
        try {
          if (existsSync(cmd)) {
            copyFileSync(cmd, `${previous}.new`)
            chmodSync(`${previous}.new`, 0o755)
            renameSync(`${previous}.new`, previous)
            phase = 'saved'
          }
          copyFileSync(binary, `${cmd}.new`)
          chmodSync(`${cmd}.new`, 0o755)
          renameSync(`${cmd}.new`, cmd)
          phase = 'replaced'
          if ((await commandVersion(ctx, cmd)) !== tag) throw new Error('confirm')
          phase = 'published'
          rmSync(previous, { force: true })
          return 0
        } catch {
          const canRestore = existsSync(previous)
          undoCli(cmd, phase)
          failed(
            ctx,
            canRestore
              ? 'Le cli n’a pas pu être remplacé. La version précédente est en place.'
              : 'Le cli n’a pas pu être installé.'
          )
          return 1
        }
      } finally {
        cleanup()
      }
    }
  )
}

async function cliTag(ctx: Context, cmd: string): Promise<string> {
  if (!existsSync(cmd)) return ''
  try {
    const tag = await commandVersion(ctx, cmd)
    return releaseParts(tag) && tag.startsWith('cli-') ? tag : ''
  } catch {
    return ''
  }
}

async function recoverInterruptedCliUpdate(ctx: Context) {
  const cmd = ctx.runtime.paths.cmd
  const previous = `${cmd}.previous`
  const target = `${cmd}.target`
  if (!existsSync(previous)) {
    rmSync(target, { force: true })
    return
  }
  const expected = existsSync(target) ? readFileSync(target, 'utf8').trim() : ''
  const current = await cliTag(ctx, cmd)
  const confirmed = expected ? current === expected : current !== ''
  if (confirmed) {
    rmSync(previous, { force: true })
    rmSync(target, { force: true })
    return
  }
  say(ctx, '  Restauration du cli interrompue.')
  undoCli(cmd, 'replaced')
  rmSync(target, { force: true })
}

function undoCli(cmd: string, phase: Phase) {
  rmSync(`${cmd}.new`, { force: true })
  if (phase === 'ready' || phase === 'published') return
  const previous = `${cmd}.previous`
  if (existsSync(previous)) {
    renameSync(previous, cmd)
    chmodSync(cmd, 0o755)
    return
  }
  if (phase === 'replaced') rmSync(cmd, { force: true })
}
