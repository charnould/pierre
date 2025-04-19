import { describe, expect, it } from 'bun:test'
import { generate_embeddings } from '../../../utils/search-by-vectors'

describe('generate_embeddings', () => {
  it('should generate embeddings for 1 string/batch:false', async () => {
    const a = await generate_embeddings(['hello world'], { provider: 'ollama', batch: false })
    expect(a).toBeArray()
    expect(a.length).toBe(1024)
    expect(a).toMatchSnapshot()
  })

  it('should generate embeddings for 1 string/batch:true', async () => {
    const a = await generate_embeddings(['hello world'], { provider: 'ollama', batch: true })
    expect(a).toBeArray()
    expect(a.length).toBe(1)
    expect(a).toMatchSnapshot()
  })

  it('should generate embeddings for 2 strings/batch:true', async () => {
    const a = await generate_embeddings(['hello world', 'Bonjour'], {
      provider: 'ollama',
      batch: true
    })
    expect(a).toBeArray()
    expect(a.length).toBe(2)
    expect(a).toMatchSnapshot()
  })

  it('should generate embeddings for 2 strings/batch:false', async () => {
    const a = await generate_embeddings(['hello world', 'Bonjour'], {
      provider: 'ollama',
      batch: false
    })
    expect(a).toBeArray()
    expect(a.length).toBe(1024)
    expect(a).toMatchSnapshot()
  })
})
