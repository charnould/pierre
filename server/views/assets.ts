import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { SERVER_ROOT } from '../utils/paths'

const DIST_DIR = join(SERVER_ROOT, 'assets/dist')
const MANIFEST_PATH = join(DIST_DIR, 'manifest.json')
const PUBLIC_BASE = '/assets/dist'

export const widgetAssets = {
  embedJs: `${PUBLIC_BASE}/js/pierre-embed.js`,
  frameCss: `${PUBLIC_BASE}/css/pierre-embed-frame.css`,
  modalCss: `${PUBLIC_BASE}/css/pierre-embed-modal.css`
} as const

type ManifestChunk = {
  file: string
  isEntry?: boolean
  css?: string[]
}

export type WebEntry = {
  jsHref: string
  cssHref: string
  jsPath: string
  cssPath: string
}

function isManifestChunk(value: unknown): value is ManifestChunk {
  return (
    typeof value === 'object' && value !== null && 'file' in value && typeof value.file === 'string'
  )
}

function publicHref(file: string): string {
  return `${PUBLIC_BASE}/${file}`
}

function readManifest(): Record<string, unknown> {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`Web manifest missing at ${MANIFEST_PATH}. Run: bun server:build`)
  }
  const manifest: unknown = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  if (typeof manifest !== 'object' || manifest === null) {
    throw new Error('Web manifest is not an object')
  }
  return manifest as Record<string, unknown>
}

function readWebEntry(entryKey: string, manifest = readManifest()): WebEntry {
  const raw = manifest[entryKey]
  const entry = isManifestChunk(raw) && raw.isEntry === true ? raw : undefined
  const cssFile = entry?.css?.[0]
  if (!entry || !cssFile) {
    throw new Error(`Web manifest missing entry ${entryKey}. Run: bun server:build`)
  }

  const jsPath = join(DIST_DIR, entry.file)
  const cssPath = join(DIST_DIR, cssFile)
  if (!existsSync(jsPath) || !existsSync(cssPath)) {
    throw new Error(`Web assets for ${entryKey} are missing on disk. Run: bun server:build`)
  }

  return {
    jsHref: publicHref(entry.file),
    cssHref: publicHref(cssFile),
    jsPath,
    cssPath
  }
}

export function readChatWebEntry(): WebEntry {
  return readWebEntry('src/chat-web/main.tsx')
}

const manifest = readManifest()
const chatWeb = readWebEntry('src/chat-web/main.tsx', manifest)
const intakeWeb = readWebEntry('src/intake-web/main.tsx', manifest)

export const chatJs = chatWeb.jsHref
export const chatCss = chatWeb.cssHref
export const intakeJs = intakeWeb.jsHref
export const intakeCss = intakeWeb.cssHref
