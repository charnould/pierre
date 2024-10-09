import { expect, it } from 'bun:test'
import { db } from '../utils/database'

it('chunks should not be too big', async () => {
  const chunks = db('knowledge').query('SELECT rowid, * FROM chunks').all()
  for (const c of chunks) {
    const length = c.chunk.length
    const MAX_LENGTH = 7800 // embedding LLM limits chunk size!
    if (length > MAX_LENGTH)
      console.log(
        '###############################\n###############################\n',
        'ROWID: ',
        c.rowid,
        '\n CHUNK:\n',
        c.chunk
      )
    expect(c.chunk.length).toBeLessThanOrEqual(MAX_LENGTH)
  }
})
