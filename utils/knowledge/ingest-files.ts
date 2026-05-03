import * as fs from 'node:fs'
import { existsSync } from 'node:fs'
import { readdir, rename } from 'node:fs/promises'
import { basename } from 'node:path'
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
  const configs: Config[] = []

  const chatbotDirs = await readdir('./customization/chatbot')
  for (const dir of chatbotDirs) {
    const content = (await import(`../../customization/chatbot/${dir}/config`)).default as Config
    configs.push(content)
  }

  if (existsSync('./customization/skills')) {
    const skillEntries = await readdir('./customization/skills', {
      withFileTypes: true
    })
    for (const entry of skillEntries.filter((e) => e.isDirectory())) {
      try {
        const content = (await import(`../../customization/skills/${entry.name}/config`))
          .default as Config
        configs.push(content)
      } catch {
        // skip skills with broken configs
      }
    }
  }

  return configs
}

export async function setupKnowledgeDirectories(): Promise<void> {
  const configs = await loadConfigs()

  for (const config of configs) {
    const knowledgePath = `datastores/${Bun.env['SERVICE']}/knowledge/${config.id}`
    await $`rm -rf ${knowledgePath} && mkdir ${knowledgePath}`

    if (config.knowledge.community) {
      const copiedPath = `${knowledgePath}/${COMMUNITY_KNOWLEDGE_DIR}`
      await $`cp -r ./knowledge ${copiedPath}`
      await renameFilesRecursively(copiedPath)
    }
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
        sheet[XLSX.utils.encode_cell({ r: row, c: col })] = {
          t: 's',
          v: mergedValue
        }
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

  const workbook = XLSX.read(await Bun.file(filepath).arrayBuffer(), {
    cellDates: true
  })
  const sheet = workbook.Sheets[workbook.SheetNames[sheetIndex]]

  unmergeSheetCells(sheet)

  const rows = XLSX.utils.sheet_to_json(sheet, {
    range: headerRowIndex,
    defval: null
  })

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

export const ingest_files = async (
  files: Metadata[]
): Promise<{ anomalies: { code: string; subject: string | null }[] }> => {
  const anomalies: { code: string; subject: string | null }[] = []

  const configs = await loadConfigs()

  const validConfigIds = new Set(configs.map((c) => c.id))
  const metadataFilenames = new Set(files.map((f) => basename(f.filepath)))
  const metadataProfiles = new Set(files.map((f) => f.access).filter(Boolean) as string[])

  // Pass 1 — File anomalies (profile-agnostic, deduplicated by filepath)
  const checkedFilepaths = new Set<string>()
  for (const metadata of files) {
    if (checkedFilepaths.has(metadata.filepath)) continue
    checkedFilepaths.add(metadata.filepath)

    const fileExists = await Bun.file(metadata.filepath).exists()
    if (!fileExists) {
      console.warn(`⚠️ File not found on disk — ${metadata.filepath}`)
      anomalies.push({
        code: 'METADATA_NOT_IN_FILES',
        subject: metadata.filename
      })
    }
  }

  const diskFiles = await readdir(`datastores/${Bun.env['SERVICE']}/files`)
  for (const f of diskFiles) {
    if (f !== '_metadata.xlsx' && !metadataFilenames.has(f)) {
      anomalies.push({ code: 'FILE_NOT_IN_METADATA', subject: f })
    }
  }

  // Pass 2 — Profile anomalies (file-existence-agnostic)
  for (const profile of metadataProfiles) {
    if (!validConfigIds.has(profile)) {
      anomalies.push({ code: 'PROFILE_MISSING_IN_ASSETS', subject: profile })
    }
  }

  for (const config of configs) {
    if (config.knowledge.proprietary && !metadataProfiles.has(config.id)) {
      anomalies.push({ code: 'PROFILE_NOT_IN_METADATA', subject: config.id })
    }
  }

  // Pass 3 — Process files with valid profile and existing on disk
  for (const metadata of files) {
    if (!metadata.access || !validConfigIds.has(metadata.access)) continue

    const fileExists = await Bun.file(metadata.filepath).exists()
    if (!fileExists) continue

    const content = await processFile(metadata)
    const outputPath = `./datastores/${Bun.env['SERVICE']}/knowledge/${metadata.access}/${normalizeFilename(metadata.agent_filename)}.${content.parser}`

    await saveFormattedFile(outputPath, content)
  }

  console.log('✅ Files processed')
  return { anomalies }
}
