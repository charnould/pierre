import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dir, '..')
const UPDATES_DIR = path.join(ROOT, 'docs/updates')
const INDEX_PATH = path.join(UPDATES_DIR, 'index.json')

export type UpdateAudience = 'dev' | 'product'

export interface UpdateEntry {
  slug: string
  title: string
  date: string
  audience: UpdateAudience
}

export interface RebuildUpdatesIndexResult {
  entries: UpdateEntry[]
  errors: string[]
}

const SLUG_PATTERN = /^\d{4}-\d{2}-\d{2}-(dev|product)-[a-z0-9]+(?:-[a-z0-9]+)*$/
const AUDIENCE_TOKENS: Record<string, UpdateAudience> = {
  dev: 'dev',
  product: 'product'
}

export function isValidCalendarDate(value: string): boolean {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return false

  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  )
}

export function validateSlug(slug: string): string | null {
  if (/\s/.test(slug)) {
    return `${slug}: slug must not contain spaces`
  }

  if (!SLUG_PATTERN.test(slug)) {
    return `${slug}: slug must match YYYY-MM-DD-{dev|product}-kebab-case`
  }

  const date = slug.slice(0, 10)
  if (!isValidCalendarDate(date)) {
    return `${slug}: slug date prefix "${date}" is not a valid calendar date`
  }

  return null
}

export function extractDateFromSlug(slug: string): string | null {
  if (validateSlug(slug)) return null
  return slug.slice(0, 10)
}

export function extractAudienceFromSlug(slug: string): UpdateAudience | null {
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})-(dev|product)-/)
  if (!match) return null

  const token = match[2]
  if (!token) return null
  return AUDIENCE_TOKENS[token] ?? null
}

export function rejectFrontmatter(markdown: string): string | null {
  if (/^---[\s\S]*?---/.test(markdown)) {
    return 'frontmatter not allowed — derive metadata from slug and # heading'
  }

  return null
}

export function extractTitleFromHeading(markdown: string): string | null {
  const heading = markdown.match(/^\s*#\s+(.+?)\s*$/m)
  return heading?.[1]?.trim() ?? null
}

export async function findArticleMarkdown(
  slug: string,
  updatesDir = UPDATES_DIR
): Promise<string | null> {
  const indexPath = path.join(updatesDir, slug, 'index.md')

  try {
    return await readFile(indexPath, 'utf8')
  } catch {
    return null
  }
}

function entryFromMarkdown(
  slug: string,
  markdown: string
): { entry: UpdateEntry | null; errors: string[] } {
  const errors: string[] = []

  const slugError = validateSlug(slug)
  if (slugError) errors.push(slugError)

  const frontmatterError = rejectFrontmatter(markdown)
  if (frontmatterError) errors.push(`${slug}: ${frontmatterError}`)

  const date = extractDateFromSlug(slug)
  if (!date && !slugError) {
    errors.push(`${slug}: unable to extract date from slug`)
  }

  const audience = extractAudienceFromSlug(slug)
  if (!audience && !slugError) {
    errors.push(`${slug}: audience token must be "dev" or "product"`)
  }

  const title = extractTitleFromHeading(markdown)
  if (!title) {
    errors.push(`${slug}: missing # heading title`)
  }

  if (errors.length > 0 || !date || !audience || !title) {
    return { entry: null, errors }
  }

  return { entry: { slug, title, date, audience }, errors }
}

export async function collectUpdateEntries(
  updatesDir = UPDATES_DIR
): Promise<RebuildUpdatesIndexResult> {
  const entries: UpdateEntry[] = []
  const errors: string[] = []
  const dirEntries = await readdir(updatesDir, { withFileTypes: true })

  for (const name of dirEntries) {
    if (!name.isDirectory()) continue

    const slug = name.name
    const slugError = validateSlug(slug)
    if (slugError) {
      errors.push(slugError)
      continue
    }

    const markdown = await findArticleMarkdown(slug, updatesDir)
    if (!markdown) {
      errors.push(`${slug}: missing index.md`)
      continue
    }

    const { entry, errors: entryErrors } = entryFromMarkdown(slug, markdown)
    errors.push(...entryErrors)
    if (!entry) continue

    entries.push(entry)
  }

  entries.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))

  return { entries, errors }
}

export async function rebuildUpdatesIndex(options?: {
  updatesDir?: string
  indexPath?: string
  dryRun?: boolean
}): Promise<RebuildUpdatesIndexResult> {
  const updatesDir = options?.updatesDir ?? UPDATES_DIR
  const indexPath = options?.indexPath ?? path.join(updatesDir, 'index.json')
  const { entries, errors } = await collectUpdateEntries(updatesDir)

  if (errors.length === 0 && !options?.dryRun) {
    await writeFile(indexPath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
  }

  return { entries, errors }
}

async function main(): Promise<void> {
  const { entries, errors } = await rebuildUpdatesIndex()

  for (const error of errors) {
    console.error(`✖ ${error}`)
  }

  if (errors.length > 0) {
    console.error(`Build failed with ${errors.length} error${errors.length === 1 ? '' : 's'}`)
    process.exitCode = 1
    return
  }

  console.log(`Wrote ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} to ${INDEX_PATH}`)
}

if (import.meta.main) {
  await main()
}
