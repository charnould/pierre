import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { renameReleaseArtifacts, targetArtifactName } from './rename-release-artifacts'

describe('targetArtifactName', () => {
  it('renames DMG artifacts', () => {
    expect(targetArtifactName('/out/foo.dmg', 'darwin', 'arm64')).toBe('pierre-macos.dmg')
  })

  it('renames darwin arm64 zip artifacts', () => {
    expect(targetArtifactName('/out/foo.zip', 'darwin', 'arm64')).toBe('pierre-macos-arm64.zip')
  })

  it('leaves Windows setup artifacts unchanged', () => {
    expect(targetArtifactName('/out/setup.exe', 'win32', 'x64')).toBeNull()
  })
})

describe('renameReleaseArtifacts', () => {
  const tempDirs: string[] = []

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
  })

  it('renames matching files on disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pierre-forge-'))
    tempDirs.push(dir)

    const dmgPath = join(dir, 'pierre.dmg')
    const zipPath = join(dir, 'pierre.zip')
    const setupPath = join(dir, 'pierre-win32-setup.exe')

    await writeFile(dmgPath, 'dmg')
    await writeFile(zipPath, 'zip')
    await writeFile(setupPath, 'setup')

    const results = await renameReleaseArtifacts([
      { platform: 'darwin', arch: 'arm64', artifacts: [dmgPath, zipPath] },
      { platform: 'win32', arch: 'x64', artifacts: [setupPath] }
    ])

    expect(results[0]?.artifacts).toEqual([
      join(dir, 'pierre-macos.dmg'),
      join(dir, 'pierre-macos-arm64.zip')
    ])
    expect(results[1]?.artifacts).toEqual([setupPath])
  })
})
