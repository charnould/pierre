import { expect, it } from 'bun:test'
import { db } from '../../utils/database'
import { count_tokens } from '../../utils/knowledge/generate-chunks-from-json'

it('community chunks should not be too big', async () => {
  // Get all chunks from `community` database

  const chunks = db('community').query('SELECT rowid, * FROM chunks').all()

  // For each chunk
  for (const c of chunks) {
    const length = count_tokens(c.chunk_text)
    const MAX_LENGTH = 8300 // embedding LLM limits chunk size!
    if (length > MAX_LENGTH) console.log(`#######\nROWID: ${c.rowid}\nCHUNK: ${c.chunk_text}`)

    expect(c.chunk.length).toBeLessThanOrEqual(MAX_LENGTH)
  }
})

// it('private chunks should not be too big', async () => {
//   // Get all chunks from `community` database

//   const chunks = db('proprietary.private').query('SELECT rowid, * FROM chunks').all()

//   // For each chunk
//   for (const c of chunks) {
//     const length = count_tokens(c.chunk_text)
//     const MAX_LENGTH = 8300 // embedding LLM limits chunk size!
//     if (length > MAX_LENGTH) console.log(`#######\nROWID: ${c.rowid}\nCHUNK: ${c.chunk_text}`)

//     expect(c.chunk_text.length).toBeLessThanOrEqual(MAX_LENGTH)
//   }
// })

// it('public chunks should not be too big', async () => {
//   // Get all chunks from `community` database

//   const chunks = db('proprietary.public').query('SELECT rowid, * FROM chunks').all()

//   // For each chunk
//   for (const c of chunks) {
//     const length = count_tokens(c.chunk_text)
//     const MAX_LENGTH = 8300 // embedding LLM limits chunk size!
//     if (length > MAX_LENGTH) console.log(`#######\nROWID: ${c.rowid}\nCHUNK: ${c.chunk_text}`)

//     expect(c.chunk_text.length).toBeLessThanOrEqual(MAX_LENGTH)
//   }
// })
