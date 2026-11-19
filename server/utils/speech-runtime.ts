import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { SPEECH_MODEL_FILE } from '../../shared/speech-model'
import { SPEECH_DIR } from './paths'

const require = createRequire(import.meta.url)

export function speechLibraryName(): string {
  if (process.platform === 'darwin') return 'libtranscribe.dylib'
  if (process.platform === 'win32') return 'transcribe.dll'
  return 'libtranscribe.so'
}

/** Directory that holds `libtranscribe` and its sibling ggml libraries. */
export function speechLibraryDir(executable = process.execPath): string | null {
  // The compiled server keeps assets in /$bunfs. The .so files are extracted beside the binary.
  const beside = join(dirname(executable), 'transcribe')
  if (existsSync(join(beside, speechLibraryName()))) return beside
  const tuple =
    process.platform === 'darwin' && process.arch === 'arm64'
      ? 'darwin-arm64-metal'
      : process.platform === 'linux' && process.arch === 'x64'
        ? 'linux-x64-cpu-vulkan'
        : ''
  if (!tuple) return null
  try {
    return join(require.resolve(`@transcribe-cpp/${tuple}/package.json`), '..')
  } catch {
    return null
  }
}

export function speechReady(): boolean {
  try {
    if (statSync(join(SPEECH_DIR, SPEECH_MODEL_FILE)).size === 0) return false
  } catch {
    return false
  }
  const dir = speechLibraryDir()
  return dir !== null && existsSync(join(dir, speechLibraryName()))
}

export function speechVersion(): string {
  try {
    return readFileSync(join(SPEECH_DIR, 'version'), 'utf8').trim()
  } catch {
    return ''
  }
}
