import { $ } from 'bun'

const url = 'https://api.github.com/repos/charnould/pierre/releases'
let latest_version: string | undefined

try {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}`)
  const releases: { tag_name: string }[] = await response.json()

  if (releases.length > 0) latest_version = releases[0].tag_name
  else latest_version = undefined
} catch (error) {
  console.error('Error fetching the latest version:', error)
  latest_version = undefined
}

const current_version = (
  await $`git describe --tags $(git rev-list --tags --max-count=1)`.text()
).trim()

console.log('')
console.log(`Actuelle → ${current_version}`)
console.log(`Dernière → ${latest_version}`)
console.log('')

// TODO:
// - mettre à jour automatiquement le code-source
// - vérifier que config.ts est correctement formaté
// await $`git fetch origin master`
// await $`git rebase origin/master`
// await $`bun pierre:version`

if (latest_version === current_version) {
  console.log('PIERRE est à jour.')

  try {
    await $`bun pierre:config`.quiet()
  } catch (e) {
    // console.log(('`config.ts` contient des erreurs.')
  }
} else if (latest_version === undefined || current_version === undefined) {
  console.error('Une anomalie est intervenue')
} else {
  console.warn("PIERRE n'est pas à jour.")
  console.warn('https://github.com/charnould/pierre/releases')
}
