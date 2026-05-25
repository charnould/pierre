import { rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export type MakeResult = {
  platform: string
  arch: string
  artifacts: string[]
}

export function targetArtifactName(file: string, platform: string, arch: string): string | null {
  if (file.endsWith('.dmg')) return 'pierre-macos.dmg'
  if (platform === 'darwin' && arch === 'arm64' && file.endsWith('.zip')) {
    return 'pierre-macos-arm64.zip'
  }
  return null
}

export async function renameReleaseArtifacts(makeResults: MakeResult[]): Promise<MakeResult[]> {
  return Promise.all(
    makeResults.map(async ({ platform, arch, artifacts }) => {
      const renamed = await Promise.all(
        artifacts.map(async (file) => {
          const targetName = targetArtifactName(file, platform, arch)
          if (!targetName) return file

          const dest = join(dirname(file), targetName)
          await rename(file, dest)
          return dest
        })
      )
      return { platform, arch, artifacts: renamed }
    })
  )
}
