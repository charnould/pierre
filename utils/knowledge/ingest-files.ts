import * as fs from 'node:fs'
import { readdir, rename } from 'node:fs/promises'
import { Readable } from 'node:stream'

import { $ } from 'bun'
import { formatInTimeZone } from 'date-fns-tz'
import { fr } from 'date-fns/locale'
import mammoth from 'mammoth'
import { format } from 'oxfmt'
import TurndownService from 'turndown'
import * as XLSX from 'xlsx'
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs'

import { Config } from '../_schema'
import type { Metadata } from './generate-metadata'
import { normalizeFilename } from './normalize'

interface FormattedContent {
  data: string
  parser: 'md' | 'json'
}

const TIMEZONE = 'Europe/Paris'
const COMMUNITY_KNOWLEDGE_DIR = 'donnees_universelles'
const CORE_ASSET_SUFFIX = 'core'

async function renameFilesRecursively(dirPath: string): Promise<void> {
  const files = await readdir(dirPath, { withFileTypes: true })

  for (const file of files) {
    const oldPath = `${dirPath}/${file.name}`
    const newName = normalizeFilename(file.name)
    const newPath = `${dirPath}/${newName}`

    if (file.name !== newName) await rename(oldPath, newPath)
    if (file.isDirectory()) await renameFilesRecursively(newPath)
  }
}

const turndownService = new TurndownService({ headingStyle: 'atx' })

async function loadConfigs(): Promise<Config[]> {
  const assetDirs = await readdir('./assets')
  const configDirs = assetDirs.filter((dir) => !dir.endsWith(CORE_ASSET_SUFFIX))

  const configs: Config[] = []
  for (const dir of configDirs) {
    const content = (await import(`../../assets/${dir}/config`)).default as Config
    configs.push(content)
  }

  return configs
}

async function setupKnowledgeDirectories(configs: Config[]): Promise<void> {
  for (const config of configs) {
    const knowledgePath = `datastores/${Bun.env['SERVICE']}/knowledge/${config.id}`
    await $`rm -rf ${knowledgePath} && mkdir ${knowledgePath}`

    if (config.knowledge.community) {
      const copiedPath = `${knowledgePath}/${COMMUNITY_KNOWLEDGE_DIR}`
      await $`cp -r ./knowledge ${copiedPath}`
      await renameFilesRecursively(copiedPath)
    }

    await $`find . -name ".DS_Store" -type f -delete`
  }
}

async function processDocxFile(filepath: string): Promise<FormattedContent> {
  const html = (await mammoth.convertToHtml({ path: filepath })).value
  // Remove images as image handling is not implemented
  const cleanHtml = html.replace(/<img[^>]*\/>/g, '')
  const markdown = turndownService.turndown(cleanHtml)

  return { data: markdown, parser: 'md' }
}

function normalizeSheetKey(key: string): string {
  return key.toLowerCase().trim()
}

function normalizeSheetValue(value: unknown): unknown {
  if (value instanceof Date) {
    return formatInTimeZone(value, TIMEZONE, 'PPPP', { locale: fr })
  }
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase()
    return normalized === '' ? null : normalized
  }
  return value
}

function unmergeSheetCells(sheet: XLSX.WorkSheet): void {
  for (const merge of sheet['!merges'] ?? []) {
    const mergedValue = sheet[XLSX.utils.encode_cell(merge.s)]?.v ?? ''
    for (let row = merge.s.r; row <= merge.e.r; row++) {
      for (let col = merge.s.c; col <= merge.e.c; col++) {
        sheet[XLSX.utils.encode_cell({ r: row, c: col })] = { t: 's', v: mergedValue }
      }
    }
  }
  sheet['!merges'] = []
}

async function processXlsxFile(
  filepath: string,
  sheetIndex: number,
  headerRowIndex: number
): Promise<FormattedContent> {
  XLSX.set_fs(fs)
  XLSX.set_cptable(cpexcel)
  XLSX.stream.set_readable(Readable)

  const workbook = XLSX.read(await Bun.file(filepath).arrayBuffer(), { cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[sheetIndex]]

  unmergeSheetCells(sheet)

  const rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex, defval: null })

  const normalizedRows = rows.map((obj) =>
    Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        normalizeSheetKey(key),
        normalizeSheetValue(value)
      ])
    )
  )

  return { data: JSON.stringify(normalizedRows), parser: 'json' }
}

async function processMarkdownFile(filepath: string): Promise<FormattedContent> {
  const markdown = await Bun.file(filepath).text()
  return { data: markdown, parser: 'md' }
}

async function processFile(metadata: Metadata): Promise<FormattedContent> {
  switch (metadata.type) {
    case 'docx':
      return processDocxFile(metadata.filepath)
    case 'xlsx':
      return processXlsxFile(metadata.filepath, metadata.sheet, metadata.headers)
    case 'md':
      return processMarkdownFile(metadata.filepath)
    default:
      throw new Error(`Unsupported file type: ${metadata.type}`)
  }
}

async function saveFormattedFile(outputPath: string, content: FormattedContent): Promise<void> {
  const { code } = await format(`a.${content.parser}`, content.data)
  await Bun.write(outputPath, code)
}

export const ingest_files = async (files: Metadata[]): Promise<void> => {
  const configs = await loadConfigs()
  await setupKnowledgeDirectories(configs)

  // Build set of valid config IDs for validation
  const validConfigIds = new Set(configs.map((c) => c.id))

  for (const metadata of files) {
    // Validate that the access config was loaded and verified
    if (!validConfigIds.has(metadata.access)) {
      console.warn(`⚠️ Skipping file: config "${metadata.access}" not found in loaded configs`)
      continue
    }

    // Skip files that don't exist in the filesystem
    const fileExists = await Bun.file(metadata.filepath).exists()
    if (!fileExists) {
      console.warn(`⚠️ Skipping file: not found on disk — ${metadata.filepath}`)
      continue
    }

    const content = await processFile(metadata)
    const outputPath = `./datastores/${Bun.env['SERVICE']}/knowledge/${metadata.access}/${normalizeFilename(metadata.agent_filename)}.${content.parser}`

    await saveFormattedFile(outputPath, content)
  }

  console.log('✅ Files processed')
}
