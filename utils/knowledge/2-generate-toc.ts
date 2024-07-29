import { readdir } from 'node:fs/promises'
import { $, type BunFile } from 'bun'
import toc from 'markdown-toc'
import * as prettier from 'prettier'

const files = await readdir('knowledge', { recursive: true })

let TOC = '# Base de connaissances\n'

let filepath: undefined | BunFile

for await (const file of files) {
  try {
    if (file.endsWith('.md') && !file.endsWith('TABLE_OF_CONTENTS.md') && !file.endsWith('CHUNKS_REPORT.md')) {
      const content = Bun.file(`knowledge/${file}`)
      filepath = content
      const data = await content.text()
      const titles = toc(data).json

      for (const t of titles) {
        if (t.lvl === 1) TOC += `## ${t.content}\n`
        if (t.lvl === 2) TOC += `### ${t.content}\n`
        if (t.lvl === 3) TOC += `- ${t.content}  \n`
        if (t.lvl === 4) TOC += `    - ${t.content}  \n`
        if (t.lvl === 5) TOC += `      - ${t.content}  \n`
        if (t.lvl === 6) TOC += `        - ${t.content}  \n`
        if (t.lvl === 7) TOC += `          - ${t.content}  \n`
        if (t.lvl === 8) TOC += `            - ${t.content}  \n`
        if (t.lvl === 9) TOC += `              - ${t.content}  \n`
      }
      TOC += '\n---\n'
    }
  } catch {
    console.log(filepath)
  }
}

const pretty = await prettier.format(TOC, { parser: 'markdown' })
await Bun.write('knowledge/TABLE_OF_CONTENTS.md', pretty)

console.log('👉 New TABLE_OF_CONTENTS.md generated')
