import { $ } from 'bun'
import { z } from 'zod'
import { chunk_json } from './chunk-json'
import { chunk_markdown } from './chunk-markdown'
import { generate_embeddings } from './generate-embeddings'
import { process_office_files } from './process-office-files'
import { remove_outdated_data } from './remove-outdated-data'
import { scrape_wikipedia } from './scrape-wikipedia'
import { store_metadata } from './store-metadata'

// knowledge type
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
      await remove_outdated_data(knowledge)
      await scrape_wikipedia(knowledge)
      await store_metadata(knowledge)
      await Bun.sleep(1000) // Pause for a 1 second to allow filesystem to complete its operations
      await process_office_files(knowledge)
      await chunk_json(knowledge)
      await chunk_markdown(knowledge)
      await generate_embeddings(knowledge)
      await $`rm -rf ./datastores/__temp__`
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
