import arg from 'arg'
import { $ } from 'bun'

import { clean_outdated_data } from './clean-outdated-data'
import { create_database } from './create-database'
import { generate_chunks_from_json } from './generate-chunks-from-json'
import { generate_chunks_from_md } from './generate-chunks-from-md'
import { generate_embeddings } from './generate-embeddings'
import { get_and_save_metadata } from './save-metadata'
import { scrap_wikipedia } from './scrap-wikipedia'
import { transform_office_file } from './transform-office-file'

export const run = async (x: string) => {
  let args: arg.Result<{ '--community': BooleanConstructor; '--proprietary': BooleanConstructor }>

  try {
    args = arg({ '--community': Boolean, '--proprietary': Boolean })

    if (args['--proprietary'] === true || args['--community'] === true || x === 'proprietary') {
      await clean_outdated_data(args)
      await scrap_wikipedia(args)
      await create_database(args)
      await get_and_save_metadata(args)
      await transform_office_file(args)
      await generate_chunks_from_json(args)
      await generate_chunks_from_md(args)
      await $`rm -rf ./datastores/__temp__`
      await generate_embeddings(args)

      console.log('\nReconstruction terminée !')
      return
    }
    throw new Error()
  } catch (e) {
    console.log(e)
  }
}

//export type Args = typeof args
