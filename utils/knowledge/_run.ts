import { $ } from 'bun'
import { z } from 'zod'
import { chunk_json } from './chunk-json'
import { chunk_markdown } from './chunk-markdown'
import { generate_vectors, wake_up_gpu } from './generate-vectors'
import { process_office_files } from './process-office-files'
import { remove_outdated_data } from './remove-outdated-data'
import { scrape_wikipedia } from './scrape-wikipedia'
import { store_metadata } from './store-metadata'

/**
 * Represents the structure of knowledge-related settings.
 *
 * @property community - Whether community knowledge should be rebuilt. Defaults to false.
 * @property proprietary - Whether proprietary knowledge should be rebuilt. Defaults to false.
 */
export const Knowledge = z
  .object({
    community: z.boolean().default(false),
    proprietary: z.boolean().default(false)
  })
  .strict()

export type Knowledge = z.infer<typeof Knowledge>

/**
 * Executes a series of asynchronous operations on the provided knowledge
 * object. The operations include removing outdated data, scraping Wikipedia,
 * initializing databases, getting and saving metadata, processing office files,
 * chunking JSON and Markdown files, generating embeddings, and cleaning up
 * temporary data.
 *
 * @param knowledge - The knowledge object to be processed. The operations will
 *                    only be executed if the `community` or `proprietary`
 *                    property of the knowledge object is true.
 *
 * @returns A promise that resolves when all operations have been completed.
 */
export const execute_pipeline = async (knowledge: Knowledge) => {
  try {
    if (knowledge.community === true || knowledge.proprietary === true) {
      if (knowledge.proprietary === true) await wake_up_gpu()
      const to = performance.now()
      await remove_outdated_data(knowledge)
      await scrape_wikipedia(knowledge)
      await store_metadata(knowledge)
      await Bun.sleep(1000) // Wait 1s for file operations
      await process_office_files(knowledge)
      await chunk_json(knowledge)
      await chunk_markdown(knowledge)
      await generate_vectors(knowledge)
      await $`rm -rf ./datastores/${Bun.env.SERVICE}/__temp__`
      const t1 = performance.now()
      console.info(`Pipeline completed in ${((t1 - to) / 1000).toFixed(2)}s`)
    }
    return
  } catch (error) {
    console.error(error)
  }
}

// If the "--community" flag is present in the command-line arguments, trigger
// the `execute_pipeline` function to rebuild `community` knowledge.
if (Bun.argv.includes('--community')) {
  await execute_pipeline({ community: true, proprietary: false })
}
