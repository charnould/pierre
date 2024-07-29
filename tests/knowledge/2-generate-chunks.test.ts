import { expect, it } from 'bun:test'
import { db } from '../../utils/database'

it('chunks should not be too big', async () => {
  const chunks = db('knowledge').query('SELECT rowid, * FROM chunks').all()
  for (const c of chunks) {
    console.log(c.rowid, ': chunk : ', c.chunk)
    expect(c.chunk.length).toBeLessThanOrEqual(8000)
  }
})
