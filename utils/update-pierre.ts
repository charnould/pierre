import { $ } from 'bun'
import chalk from 'chalk'

const latest_version = (
  await $`git fetch --tags && git describe --tags $(git rev-list --tags --max-count=1)`.text()
).trim()

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
} else {
  console.log(chalk.red.bold("PIERRE n'est pas à jour."))
  console.log(chalk.red.underline('https://github.com/charnould/pierre/releases'))
  console.log('')
}
