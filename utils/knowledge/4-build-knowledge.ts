import { $ } from 'bun'

await $`bun run utils/knowledge/1-scrap-wikipedia.ts`
await $`bun run utils/knowledge/2-generate-chunks.ts`
await $`bun run utils/knowledge/3-generate-vectors.ts`
