import { generate_metadata } from './generate-metadata'
import { ingest_files } from './ingest-files'
import { scrape_wikipedia } from './scrape-wikipedia'

const COMMUNITY_FLAG = '--community'
const COMMUNITY_TYPE = 'community'

export const run_pipeline = async (knowledgeType: string): Promise<void> => {
  try {
    const startTime = performance.now()

    if (knowledgeType === COMMUNITY_TYPE) await scrape_wikipedia()

    const files = await generate_metadata()
    if (files === undefined) throw new Error('Failed to load metadata')

    await ingest_files(files)

    const durationSeconds = ((performance.now() - startTime) / 1000).toFixed(3)
    console.info(`✅ Pipeline completed in ${durationSeconds}s`)
  } catch (e) {
    console.error('❌ Pipeline execution failed', e)
  }
}

if (Bun.argv.includes(COMMUNITY_FLAG)) {
  await run_pipeline(COMMUNITY_TYPE)
}
