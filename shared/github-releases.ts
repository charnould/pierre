export type ReleaseAsset = { name: string; sha256: string }

export type Release = {
  tag: string
  draft: boolean
  prerelease: boolean
  assets: ReleaseAsset[]
}

const RELEASES = 'https://api.github.com/repos/charnould/pierre/releases'
const SHA256 = /^[a-f0-9]{64}$/

export function parseGitHubRelease(value: unknown): Release | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const tag = record['tag_name']
  if (typeof tag !== 'string' || tag.length === 0) return null
  return {
    tag,
    draft: record['draft'] === true,
    prerelease: record['prerelease'] === true,
    assets: parseAssets(record['assets'])
  }
}

export async function listGitHubReleases(
  load: (url: string) => Promise<{ status: number; body: string }>
): Promise<Release[]> {
  const releases: Release[] = []
  for (let page = 1; page <= 5; page += 1) {
    const response = await load(`${RELEASES}?per_page=100&page=${page}`)
    if (response.status !== 200) throw new Error('Impossible de lire les releases GitHub.')
    const parsed = parseJson(response.body)
    if (!Array.isArray(parsed)) throw new Error('Les releases GitHub sont illisibles.')
    if (parsed.length === 0) break
    for (const item of parsed) {
      const release = parseGitHubRelease(item)
      if (release) releases.push(release)
    }
    if (parsed.length < 100) break
    if (page === 5) throw new Error('Le catalogue GitHub est tronqué.')
  }
  return releases
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body)
  } catch {
    throw new Error('Les releases GitHub sont illisibles.')
  }
}

function parseAssets(value: unknown): ReleaseAsset[] {
  if (!Array.isArray(value)) return []
  const assets: ReleaseAsset[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    const name = record['name']
    if (typeof name !== 'string' || name.length === 0) continue
    assets.push({ name, sha256: sha256Digest(record['digest']) })
  }
  return assets
}

function sha256Digest(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('sha256:')) return ''
  const hex = value.slice('sha256:'.length)
  return SHA256.test(hex) ? hex : ''
}
