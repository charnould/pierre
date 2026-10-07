import { join } from 'node:path'

import { $ } from 'bun'

const serverPkg = (await Bun.file(join(import.meta.dirname, '..', 'package.json')).json()) as {
  version?: string
}

const url = 'https://api.github.com/repos/charnould/pierre/releases'
let latest_version: string | undefined

try {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}`)
  const releases: { tag_name: string; draft: boolean; prerelease: boolean }[] =
    await response.json()
  latest_version = releases
    .filter(
      (release) =>
        !release.draft && !release.prerelease && /^server-\d+\.\d+\.\d+$/.test(release.tag_name)
    )
    .map((release) => release.tag_name)
    .sort((left, right) => {
      const a = left.slice('server-'.length).split('.').map(Number)
      const b = right.slice('server-'.length).split('.').map(Number)
      for (let index = 0; index < 3; index += 1) {
        if (a[index] !== b[index]) return (b[index] ?? 0) - (a[index] ?? 0)
      }
      return 0
    })[0]
} catch (error) {
  console.error('Error fetching the latest version:', error)
  latest_version = undefined
}

const current_version = serverPkg.version ? `server-${serverPkg.version}` : undefined

console.log('')
console.log(`Actuelle → ${current_version ?? '?'}`)
console.log(`Dernière → ${latest_version ?? '?'}`)
console.log('')

if (latest_version === current_version) {
  console.log(`😍 PIERRE est à jour !`)
  console.log('')

  try {
    await $`bun pierre:config`.quiet()
  } catch {
    // config.ts validation optional
  }
} else if (latest_version === undefined || current_version === undefined) {
  console.log(`❌ Une anomalie est intervenue`)
} else {
  console.warn(`❌ PIERRE n'est pas à jour.`)
  console.warn(`❌ https://github.com/charnould/pierre/releases`)
}
