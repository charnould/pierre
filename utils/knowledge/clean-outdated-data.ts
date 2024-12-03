import { $ } from 'bun'
import chalk from 'chalk'
import ora from 'ora'
import type { Args } from './_run'

export const clean_outdated_data = async (args: Args) => {
  // No need for try/cacth because `rm` command is
  // silent by default if the target does not exist.

  // Start spinner
  const spinner = ora('Ménage en cours').start()

  await $`mkdir ./knowledge/.data/`

  if (args['--community'] === true) {
    await $`rm -rf ./knowledge/wikipedia`
    await $`rm -rf ./knowledge/.data/community.sqlite`
  }

  if (args['--proprietary'] === true) {
    await $`rm -rf ./datastores/__temp__`
    await $`rm -rf ./knowledge/.data/proprietary.public.sqlite`
    await $`rm -rf ./knowledge/.data/proprietary.private.sqlite`
  }

  // End spinner
  spinner.succeed(chalk.green('Ménage réalisé'))
  return
}
