import { describe, expect, test } from 'bun:test'

import { listGitHubReleases } from './github-releases'

const release = (tag: string) => ({
  tag_name: tag,
  draft: false,
  prerelease: false,
  assets: []
})

describe('listGitHubReleases', () => {
  test('conserve la première page quand la suivante est refusée', async () => {
    const page = Array.from({ length: 100 }, (_, index) => release(`cli-0.0.${index}`))
    page[0] = release('carl-1.0.0')
    const releases = await listGitHubReleases(async (url) => {
      if (url.endsWith('page=1')) return { status: 200, body: JSON.stringify(page) }
      return { status: 403, body: '' }
    })
    expect(releases[0]?.tag).toBe('carl-1.0.0')
    expect(releases).toHaveLength(100)
  })

  test('indique le statut HTTP quand la première page échoue', async () => {
    await expect(listGitHubReleases(async () => ({ status: 403, body: '' }))).rejects.toThrow(
      'Impossible de lire les releases GitHub (403).'
    )
  })
})
