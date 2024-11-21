import { expect, it } from 'bun:test'
import { db } from '../../utils/database'

it('chunks should not be too big', async () => {
  // Get all chunks from `community` database
  const chunks = db('community').query('SELECT rowid, * FROM chunks').all()

  // For each chunk
  for (const c of chunks as {
    rowid: number
    chunk: string
  }[]) {
    const length = c.chunk.length
    const MAX_LENGTH = 7800 // embedding LLM limits chunk size!
    if (length > MAX_LENGTH) console.log(`#######\nROWID: ${c.rowid}\nCHUNK: ${c.chunk}`)

    expect(c.chunk.length).toBeLessThanOrEqual(MAX_LENGTH)
  }
})
