import { Database } from 'bun:sqlite'
import { readdir } from 'node:fs/promises'
import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
import { $ } from 'bun'
import { Document, MarkdownNodeParser } from 'llamaindex'
import * as sqlite_vss from 'sqlite-vss'

console.log(' ')
console.log('______________')
console.log(' ')
console.log('Start building knowledge database')
console.log('Estimated build time: 10-15 min')
console.log(' ')

// Delete old knowledge database
await $`rm -f ./utils/knowledge/datastore.sqlite`
console.log(' 👉 Outdated knowledge database deleted')

// Create database
Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib') // when coding on Mac OS X
const db = new Database('./utils/knowledge/datastore.sqlite')
sqlite_vss.load(db)

// const version = db.prepare('select vss_version()').get()
// console.log(version)

db.exec('CREATE VIRTUAL TABLE chunks USING FTS5(chunk);')

const files = await readdir('knowledge', { recursive: true })

for await (const file of files) {
  if (file.endsWith('.md')) {
    console.log(' 👉 working on: ', file)

    const content = Bun.file(`knowledge/${file}`)
    const data = await content.text()
    const nodeParser = new MarkdownNodeParser()
    const nodes = nodeParser.getNodesFromDocuments([new Document({ text: data })])

    for await (const node of nodes) {
      let chunk = ''

      for (const key in node.metadata) {
        if (key === 'Header 1') chunk += `# ${node.metadata[key]}\n`
        if (key === 'Header 2') chunk += `## ${node.metadata[key]}\n`
        if (key === 'Header 3') chunk += `### ${node.metadata[key]}\n`
        if (key === 'Header 4') chunk += `#### ${node.metadata[key]}\n`
        if (key === 'Header 5') chunk += `##### ${node.metadata[key]}\n`
        if (key === 'Header 6') chunk += `###### ${node.metadata[key]}\n`
        if (key === 'Header 7') chunk += `####### ${node.metadata[key]}\n`
      }

      chunk += node.text // TODO: supprimer la répétition du dernier titre dans le chunk

      db.prepare('INSERT INTO chunks(chunk) VALUES(?);').run(chunk)
    }
  }
}

// foreach row, create embedding, and save it with the very same embedding
db.exec('CREATE VIRTUAL TABLE vectors using vss0(vector(3072));')
const query = db.query('SELECT rowid, * FROM chunks').all()

for await (const q of query) {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-large'),
    value: q.chunk
  })

  db.prepare('INSERT INTO vectors(rowid, vector) VALUES (?, ?)').run(q.rowid, JSON.stringify(embedding))
}

console.log(' ')
console.log('End building knowledge database')
console.log('______________')
console.log(' ')
