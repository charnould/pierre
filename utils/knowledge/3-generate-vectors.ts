import { Database } from 'bun:sqlite'
import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
import * as sqliteVec from 'sqlite-vec'

Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib') // when coding on Mac OS X
const db = new Database('./utils/knowledge/datastore.sqlite')
sqliteVec.load(db)

console.log('👉 Start building Knowledge database')
console.log('   Estimated duration: 10-15 min')
console.log('   DO *NOT* CLOSE YOUR SHELL!')

db.exec('CREATE VIRTUAL TABLE vectors USING vec0(vector float[3072])')
const query = db.query('SELECT rowid, * FROM chunks').all()

for await (const q of query) {
  const { embedding: vector } = await embed({
    model: openai.embedding('text-embedding-3-large'),
    value: q.chunk
  })

  db.prepare('INSERT INTO vectors(rowid, vector) VALUES (?, vec_f32(?))').run(
    q.rowid,
    new Float32Array(vector)
  )
}

console.log('👉 Knowledge database built')
console.log('   YOU CAN CLOSE YOUR SHELL')
