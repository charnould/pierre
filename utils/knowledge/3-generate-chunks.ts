import { Database } from 'bun:sqlite'
import { readdir } from 'node:fs/promises'
import { $ } from 'bun'

console.log('______________')
console.log('START BUILDING KNOWLEDGE DATABASE')
console.log('(estimated build time: 60 min)')

// Delete old knowledge database
await $`rm -f ./utils/knowledge/datastore.sqlite`
console.log(' 👉 Outdated knowledge database deleted')

// Create database
Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib') // when coding on Mac OS X
const db = new Database('./utils/knowledge/datastore.sqlite')

// const version = db.prepare('select vss_version()').get()
// console.log(version)

db.exec('CREATE VIRTUAL TABLE chunks USING FTS5(chunk, questions);')

const files = await readdir('knowledge', { recursive: true })

for await (const file of files) {
  if (file.endsWith('.md')) {
    console.log(' 👉 working on:', file)

    const content = Bun.file(`knowledge/${file}`)
    const data = await content.text()
    const splitted_data = data.split(/[^#]##\s/)

    for (let index = 1; index < splitted_data.length; index++) {
      const chunk = `${splitted_data[0]}\n## ${splitted_data[index].trim()}`
      console.log('######################################\n', chunk)
      db.prepare('INSERT INTO chunks(chunk) VALUES(?);').run(chunk)
    }
  }
}
