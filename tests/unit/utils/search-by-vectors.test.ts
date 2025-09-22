import { describe, expect, it } from 'bun:test'
import { generate_embeddings, search } from '../../../utils/search-by-vectors'

// If enabled, this test will not pass in CI,
// because it requires a local instance of the Ollama server to be running.
describe('generate_embeddings', () => {
  it('should generate embeddings for 1 string/batch:false', async () => {
    const a = await generate_embeddings(['hello world'], {
      provider: 'ollama',
      batch: false
    })
    expect(a).toBeArray()
    expect(a.length).toBe(1024)
    expect(a).toMatchSnapshot()
  })

  it('should generate embeddings for 1 string/batch:true', async () => {
    const a = await generate_embeddings(['hello world'], {
      provider: 'ollama',
      batch: true
    })
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

  it('should generate find relevant chunks with access', async () => {
    const a = await generate_embeddings(
      [
        'Valérie Létard, née le 13 octobre 1962 à Orchies (Nord), est une femme politique française.'
      ],
      {
        provider: 'ollama',
        batch: false
      }
    )
    const s = search({ db_name: 'community', vector: a, chunk_access: 'community' })
    expect(s).toMatchSnapshot()
  })

  it('should generate find relevant chunks with no-access', async () => {
    const a = await generate_embeddings(['Valérie Létard'], { provider: 'ollama', batch: false })
    const s = search({ db_name: 'community', vector: a, chunk_access: 'not-an-access' })
    expect(s).toStrictEqual([])
  })
})
