import { Database } from 'bun:sqlite'
import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
import * as sqlite_vss from 'sqlite-vss'

const db = new Database('./utils/knowledge/datastore.sqlite')
sqlite_vss.load(db)

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

  db.prepare('INSERT INTO vectors(rowid, chunk_vector, questions_vector) VALUES (?, ?, ?)').run(
    q.rowid,
    JSON.stringify(chunk_vector),
    JSON.stringify(questions_vector)
  )
}

console.log('END BUILDING KNOWLEDGE DATABASE')
console.log('You can safely close your shell.')
console.log('______________')