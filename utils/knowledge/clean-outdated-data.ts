import { $ } from 'bun'
import type { Args } from './_run'

export const clean_outdated_data = async (args: Args) => {
  // No need for try/cacth because `rm` command is
  // silent by default if the target does not exist.

  await $`rm -rf ./datastores/__temp__`

  if (args['--community'] === true) {
    await $`rm -rf ./knowledge/wikipedia`
    await $`rm -rf ./knowledge/community.sqlite`
  }

  if (args['--proprietary'] === true) {
    await $`rm -rf ./datastores/__temp__`
    await $`rm -rf ./datastores/proprietary.public.sqlite`
    await $`rm -rf ./datastores/proprietary.private.sqlite`
  }

  console.log('Ménage réalisé')
  return
}
