import { describe, expect, it } from 'bun:test'

const source = async (relativePath: string): Promise<string> =>
  Bun.file(new URL(`../../../../${relativePath}`, import.meta.url)).text()

describe('bulk communications module graph', () => {
  it('keeps communications leaves independent from bulk orchestration', async () => {
    for (const file of ['utils/communications/storage.ts', 'utils/communications/status.ts']) {
      expect(await source(file)).not.toMatch(/from ['"][^'"]*\/bulk(?:\/|['"])/)
    }
  })

  it('does not route touched bulk leaves through thin barrels', async () => {
    for (const file of [
      'utils/bulk/outbound.ts',
      'utils/bulk/send.ts',
      'utils/bulk/scheduler/transport.ts'
    ]) {
      const contents = await source(file)
      expect(contents).not.toMatch(/from ['"][^'"]*\/communications['"]/)
      expect(contents).not.toMatch(/from ['"][^'"]*\/scheduler['"]/)
    }
  })
})
