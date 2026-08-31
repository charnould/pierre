const UPDATES_GITHUB_BRANCH = 'docs/hlm-data-domain-model'
export const UPDATES_CHANGELOG_FOLDER = '01-changelog'

const REPO = 'charnould/pierre'

/** Raw CDN — used for markdown images / browser links (not for the index). */
const UPDATES_GITHUB_BASE = `https://raw.githubusercontent.com/${REPO}/${UPDATES_GITHUB_BRANCH}/docs`

/**
 * GitHub Contents API (raw body via Accept header) — preferred for toc + article
 * markdown so we are not stuck behind the raw.githubusercontent.com CDN cache.
 */
const UPDATES_GITHUB_CONTENTS = `https://api.github.com/repos/${REPO}/contents/docs`

/** Folder discovered from toc.json (or default). Used for markdown / asset URLs. */
let resolvedChangelogFolder = UPDATES_CHANGELOG_FOLDER

export function getChangelogFolder(): string {
  return resolvedChangelogFolder
}

export function setChangelogFolder(folder: string): void {
  resolvedChangelogFolder = folder
}

export function resetChangelogFolder(): void {
  resolvedChangelogFolder = UPDATES_CHANGELOG_FOLDER
}

export function updatesIndexUrl(): string {
  return `${UPDATES_GITHUB_CONTENTS}/toc.json?ref=${encodeURIComponent(UPDATES_GITHUB_BRANCH)}`
}

export function updateMarkdownUrl(slug: string, folder: string = getChangelogFolder()): string {
  return `${UPDATES_GITHUB_CONTENTS}/${folder}/${encodeURIComponent(slug)}.md?ref=${encodeURIComponent(UPDATES_GITHUB_BRANCH)}`
}

export function updateAssetUrl(
  slug: string,
  relativePath: string,
  folder: string = getChangelogFolder()
): string {
  const encodedSlug = encodeURIComponent(slug)
  const encodedPath = relativePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
  return `${UPDATES_GITHUB_BASE}/${folder}/${encodedSlug}/${encodedPath}`
}

export function updateGitHubWebUrl(slug: string, folder: string = getChangelogFolder()): string {
  return `https://github.com/${REPO}/blob/${UPDATES_GITHUB_BRANCH}/docs/${folder}/${encodeURIComponent(slug)}.md`
}
