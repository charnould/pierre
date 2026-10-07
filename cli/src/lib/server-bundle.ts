import { chmodSync, copyFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { commandVersion, fetchTo, verifyReleaseDigest } from './github.ts'
import { CommandFailed, type Context } from './system.ts'

const SERVER_BINARY = 'pierre'
const ONNX_LIBRARY = 'libonnxruntime.so.1'

export async function stageServerBundle(ctx: Context, tag: string, directory: string) {
  const binary = join(directory, SERVER_BINARY)
  const library = join(directory, ONNX_LIBRARY)

  await fetchTo(ctx, SERVER_BINARY, binary, tag)
  await fetchTo(ctx, ONNX_LIBRARY, library, tag)
  chmodSync(binary, 0o755)

  if (!existsSync(library) || statSync(library).size === 0) {
    throw new CommandFailed(1, 'La bibliothèque ONNX est absente ou vide.')
  }
  if ((await commandVersion(ctx, binary)) !== tag) {
    throw new CommandFailed(1, `Le binaire serveur n’annonce pas ${tag}.`)
  }

  await verifyReleaseDigest(ctx, tag, SERVER_BINARY, binary)
  await verifyReleaseDigest(ctx, tag, ONNX_LIBRARY, library)
}

export function prepareServerFiles(ctx: Context, directory: string) {
  const { bin, so } = ctx.runtime.paths
  copyFileSync(join(directory, SERVER_BINARY), `${bin}.new`)
  copyFileSync(join(directory, ONNX_LIBRARY), `${so}.new`)
  chmodSync(`${bin}.new`, 0o755)
  chmodSync(`${so}.new`, 0o644)
}
