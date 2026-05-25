export const UPDATES_GITHUB_BASE =
  'https://raw.githubusercontent.com/charnould/pierre/master/docs/updates'

export function updatesIndexUrl(): string {
  return `${UPDATES_GITHUB_BASE}/index.json`
}

export function updateMarkdownUrl(slug: string): string {
  return `${UPDATES_GITHUB_BASE}/${encodeURIComponent(slug)}/index.md`
}

export function updateAssetUrl(slug: string, relativePath: string): string {
  const encodedSlug = encodeURIComponent(slug)
  const encodedPath = relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${UPDATES_GITHUB_BASE}/${encodedSlug}/${encodedPath}`
}

export function updateGitHubWebUrl(slug: string): string {
  return `https://github.com/charnould/pierre/blob/master/docs/updates/${encodeURIComponent(slug)}/index.md`
}
