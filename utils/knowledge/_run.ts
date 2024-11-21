import arg from 'arg'
import { $ } from 'bun'
import chalk from 'chalk'

import { clean_outdated_data } from './clean-outdated-data'
import { create_database } from './create-database'
import { generate_chunks_from_json } from './generate-chunks-from-json'
import { generate_chunks_from_md } from './generate-chunks-from-md'
import { generate_embeddings } from './generate-embeddings'
import { get_and_save_metadata } from './save-metadata'
import { scrap_wikipedia } from './scrap-wikipedia'
import { transform_office_file } from './transform-office-file'

let args: arg.Result<{ '--community': BooleanConstructor; '--proprietary': BooleanConstructor }>

try {
  await $`clear`

  console.log(chalk.dim('――――――――――――――――――――――――――――――――――――――'))
  console.log('\n')
  console.log(chalk.blue.bold('PIERRE'))
  console.log(chalk.blue('Reconstruction des connaissances'))
  console.log('\n')

  args = arg({ '--community': Boolean, '--proprietary': Boolean })

  if (args['--proprietary'] === true || args['--community'] === true) {
    if (args['--proprietary'] === true)
      console.log(chalk.blue.dim('Reconstruction de `proprietary`'))
    if (args['--community'] === true) console.log(chalk.blue.dim('Reconstruction de `community`'))
    console.log('\n')

    await clean_outdated_data(args)
    await scrap_wikipedia(args)
    await create_database(args)
    await get_and_save_metadata(args)
    await transform_office_file(args)
    await generate_chunks_from_json(args)
    await generate_chunks_from_md(args)
    await $`rm -rf ./datastores/__temp__`
    await generate_embeddings(args)

    console.log('\n')
    console.log(chalk.bgGreen.bold('                             '))
    console.log(chalk.bgGreen.bold('  Reconstruction terminée !  '))
    console.log(chalk.bgGreen.bold('                             '))
    console.log('\n')

    console.log(chalk.bold('Prochaines étapes\n'))
    console.log(' - Effectuer un commit des modifications')
    console.log(' - Tester en local les nouvelles connaissances')
    console.log(' - Déployer pour appliquer les modifications')
  } else {
    throw new Error()
  }
} catch (e) {
  console.log(e)
  console.log(chalk.red('Syntaxe non-valide'))
  console.log('\n')
  console.log('essayer :  bun generate --community')
  console.log('           bun generate --proprietary')
  console.log('           bun generate --proprietary --community')
}

console.log('\n')
console.log(chalk.yellow('Une question/problème ?'))
console.log('\n')
console.log(' - github.com/charnould/pierre/issues')
console.log(' - charnould@pierre-ia.org')
console.log('\n')
console.log(chalk.dim('――――――――――――――――――――――――――――――――――――――'))
console.log('\n')

export type Args = typeof args
