import { readdir } from 'node:fs/promises'
import { $ } from 'bun'
import toc from 'markdown-toc'
import * as prettier from 'prettier'

await $`rm -f KNOWLEDGE.md`

const files = await readdir('knowledge', { recursive: true })

let TOC = '# Base de connaissances\n'

for await (const file of files) {
  if (file.endsWith('.md')) {
    const content = Bun.file(`knowledge/${file}`)
    const data = await content.text()
    const h1 = toc(data).json
    const table_of_contents = toc(data, { firsth1: false }).content
    TOC += `## ${h1[0].content}\n${table_of_contents}\n`
  }
}

const pretty = await prettier.format(TOC, { parser: 'markdown' })
await Bun.write('KNOWLEDGE.md', pretty)
