import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  generateDocxFilename,
  generateDocxFromTemplate
} from '../../../desktop/src/lib/generate-docx'

const TEMPLATE_PATH = join(
  import.meta.dir,
  '../../../customization/skills/request.reply-letter/template.docx'
)

describe('generateDocxFilename', () => {
  it('retourne le format YYYY-MM-DD - Courrier  sortant', () => {
    const filename = generateDocxFilename()
    expect(filename).toMatch(/^\d{4}-\d{2}-\d{2} - Courrier {2}sortant$/)
  })

  it('contient la date du jour', () => {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    expect(generateDocxFilename()).toStartWith(`${yyyy}-${mm}-${dd}`)
  })
})

describe('generateDocxFromTemplate', () => {
  it('génère un fichier docx valide à partir du template', async () => {
    const buffer = readFileSync(TEMPLATE_PATH).buffer as ArrayBuffer
    const result = await generateDocxFromTemplate(buffer, 'Bonjour, voici le courrier.')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
    // Un docx est un ZIP — commence par la signature PK (0x50 0x4B)
    expect(result[0]).toBe(0x50)
    expect(result[1]).toBe(0x4b)
  })

  it('gère un contenu multi-lignes', async () => {
    const content = 'Ligne 1\nLigne 2\nLigne 3'
    const buffer = readFileSync(TEMPLATE_PATH).buffer as ArrayBuffer
    const result = await generateDocxFromTemplate(buffer, content)
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })
})
