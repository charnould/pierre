import { $ } from 'bun'
import chalk from 'chalk'

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
// await $`bun version`

if (latest_version === current_version) {
  console.log(chalk.green.bold('PIERRE est à jour.'))
  console.log('')

  try {
    await $`bun test:config`.quiet()
  } catch (e) {
    // console.log(chalk.red('`config.ts` contient des erreurs.'))
  }
} else if (latest_version === undefined || current_version === undefined) {
  console.log(chalk.red('Une anomalie est intervenue'))
  console.log('')
} else {
  console.log(chalk.red.bold("PIERRE n'est pas à jour."))
  console.log(chalk.red.underline('https://github.com/charnould/pierre/releases'))
  console.log('')
}
