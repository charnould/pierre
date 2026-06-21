import { $ } from 'bun'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const rootPkg = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', '..', 'package.json'), 'utf8')
) as { version?: string }

const url = 'https://api.github.com/repos/charnould/pierre/releases'
let latest_version: string | undefined

try {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}`)
  const releases: { tag_name: string }[] = await response.json()

  if (releases.length > 0) latest_version = releases[0].tag_name.replace(/^v/, '')
  else latest_version = undefined
} catch (error) {
  console.error('Error fetching the latest version:', error)
  latest_version = undefined
}

const current_version = rootPkg.version

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
