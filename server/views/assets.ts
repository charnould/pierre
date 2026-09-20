import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { SERVER_ROOT } from '../utils/paths'

const DIST_DIR = join(SERVER_ROOT, 'assets/dist')
const MANIFEST_PATH = join(DIST_DIR, '.vite/manifest.json')
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

export type ChatWebEntry = {
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

export function readChatWebEntry(): ChatWebEntry {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Chat Vite manifest missing at ${MANIFEST_PATH}. Run: bun --filter @pierre/server server:build`
    )
  }

  const manifest: unknown = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  if (typeof manifest !== 'object' || manifest === null) {
    throw new Error('Chat Vite manifest is not an object')
  }

  const chunks = Object.values(manifest).filter(isManifestChunk)
  const entry = chunks.find((chunk) => chunk.isEntry === true)
  // Vite 8 / Rolldown emits the stylesheet as a sibling `style.css` entry, not `entry.css`.
  const cssFile = entry?.css?.[0] ?? chunks.find((chunk) => chunk.file.endsWith('.css'))?.file
  if (!entry || !cssFile) {
    throw new Error(
      'Chat Vite manifest has no JS/CSS entry. Run: bun --filter @pierre/server server:build'
    )
  }

  const jsPath = join(DIST_DIR, entry.file)
  const cssPath = join(DIST_DIR, cssFile)
  if (!existsSync(jsPath) || !existsSync(cssPath)) {
    throw new Error(
      'Chat Vite assets are missing on disk. Run: bun --filter @pierre/server server:build'
    )
  }

  return {
    jsHref: publicHref(entry.file),
    cssHref: publicHref(cssFile),
    jsPath,
    cssPath
  }
}

const chatWeb = readChatWebEntry()

export const chatJs = chatWeb.jsHref
export const chatCss = chatWeb.cssHref
