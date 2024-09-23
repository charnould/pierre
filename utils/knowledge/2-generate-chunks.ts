import { Database } from 'bun:sqlite'
import { readdir } from 'node:fs/promises'
import { Document, MarkdownNodeParser } from 'llamaindex'

// Create database
Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib') // when coding on Mac OS X
const db = new Database('./utils/knowledge/datastore.sqlite')

db.exec('CREATE VIRTUAL TABLE chunks USING FTS5(chunk);')

const files = await readdir('knowledge', { recursive: true })

for await (const file of files) {
  if (file.endsWith('.md') && !file.endsWith('README.md') && !file.endsWith('SUMMARY.md')) {
    const content = Bun.file(`knowledge/${file}`)
    const data = await content.text()

    const nodes = new MarkdownNodeParser().getNodesFromDocuments([new Document({ text: data })])

    for (const node of nodes) {
      if (node.text.length > 100) {
        let chunk = ''
        chunk += node.metadata.Header_1 !== undefined ? `# ${node.metadata.Header_1}\n` : ''
        chunk += node.metadata.Header_2 !== undefined ? `## ${node.metadata.Header_2}\n` : ''
        chunk += node.metadata.Header_3 !== undefined ? `### ${node.metadata.Header_3}\n` : ''
        chunk += node.metadata.Header_4 !== undefined ? `#### ${node.metadata.Header_4}\n` : ''
        chunk += node.metadata.Header_5 !== undefined ? `##### ${node.metadata.Header_5}\n` : ''
        chunk += node.metadata.Header_6 !== undefined ? `###### ${node.metadata.Header_6}\n` : ''
        chunk += node.metadata.Header_7 !== undefined ? `####### ${node.metadata.Header_7}\n` : ''
        chunk += `${node.text}\n`
        db.prepare('INSERT INTO chunks(chunk) VALUES(?);').run(chunk)
      }
    }
  }
}

console.log('👉 New chunks saved into knowledge.sqlite')
