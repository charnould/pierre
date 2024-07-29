import { Database } from 'bun:sqlite'
import { readdir } from 'node:fs/promises'
import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
import { generateObject} from 'ai'
import { $ } from 'bun'
import * as sqlite_vss from 'sqlite-vss'
import { z } from 'zod'

console.log(' ')
console.log('______________')
console.log(' ')
console.log('START BUILDING KNOWLEDGE DATABASE')
console.log('(estimated build time: 10-15 min)')
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
      
      const { object } = await generateObject({
        model: openai('gpt-4o-mini-2024-07-18'),
        schema: z.object({
          questions: z.array(z.string()).describe('Questions')
        }),
        mode: 'json',
        messages: [
          {
            role: 'system',
            content: `
              ### CHUNK ###
              ${chunk}
              
              ### INSTRUCTION ###
              List 5-15 questions above chunk answer to
              Answer only in french language.
              Return results in JSON.
              `.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
          }
        ]
      })

      const { questions } = object
      let questions_list = ''
      for (const q of questions) {
        questions_list += '- ' + q + '\n'
      }

      db.prepare('INSERT INTO chunks(chunk, questions) VALUES(?, ?);').run(chunk, questions_list)
    }
  }
}

db.exec('CREATE VIRTUAL TABLE vectors using vss0(chunk_vector(3072), questions_vector(3072));')
const query = db.query('SELECT rowid, * FROM chunks').all()

for await (const q of query) {
  const { embedding: chunk_vector } = await embed({
    model: openai.embedding('text-embedding-3-large'),
    value: q.chunk
  })

  const { embedding: questions_vector } = await embed({
    model: openai.embedding('text-embedding-3-large'),
    value: q.questions
  })

  db.prepare('INSERT INTO vectors(rowid, chunk_vector, questions_vector) VALUES (?, ?, ?)').run(q.rowid, JSON.stringify(chunk_vector), JSON.stringify(questions_vector))
}

console.log(' ')
console.log('END BUILDING KNOWLEDGE DATABASE')
console.log('You can safely close your Terminal')
console.log('______________')
console.log(' ')
