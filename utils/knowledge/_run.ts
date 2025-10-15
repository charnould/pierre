import { $ } from 'bun'
import { z } from 'zod'
import { chunk_json } from './chunk-json'
import { chunk_markdown } from './chunk-markdown'
import { generate_vectors, wake_up_gpu } from './generate-vectors'
import { process_files } from './process-files'
import { remove_outdated_data } from './remove-outdated-data'
import { scrape_wikipedia } from './scrape-wikipedia'
import { store_metadata } from './store-metadata'

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
    if (!knowledge.community && !knowledge.proprietary) throw '❌ Missing knowledge source'

    const rebuild_at = new Date().toISOString()

    // Knowledge rebuild pipeline
    console.info(`Starting knowledge rebuild pipeline...`)

    await wake_up_gpu(knowledge) // Applies only to proprietary knowledge
    const t0 = performance.now()
    await store_metadata(knowledge)
    await remove_outdated_data(knowledge)
    await scrape_wikipedia(knowledge)
    await process_files(knowledge)
    await chunk_json(knowledge, rebuild_at)
    await chunk_markdown(knowledge, rebuild_at)
    await generate_vectors(knowledge, rebuild_at)
    await $`rm -rf ./datastores/${Bun.env.SERVICE}/temp` // Cleanup
    const t1 = performance.now()

    console.info(`✅ Knowledge rebuilt! Pipeline completed in ${((t1 - t0) / 1000).toFixed(2)}s.`)

    return
  } catch (e) {
    console.log(e)
    console.error('❌ Pipeline execution failed')
    return
  }
}

// If the "--community" flag is present in the command-line arguments, trigger
// the `execute_pipeline` function to rebuild `community` knowledge.
if (Bun.argv.includes('--community')) {
  await execute_pipeline({ community: true, proprietary: false })
}

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
