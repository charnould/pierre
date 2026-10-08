import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { generateDocxFilename, generateDocxFromTemplate } from './generate-docx'

const TEMPLATE_PATH = join(
  import.meta.dir,
  '../../../../..',
  'docs',
  '04-core-intelligence-hlm',
  'templates',
  'Courrier postal.docx'
)

describe('generateDocxFilename', () => {
  it('retourne le format YYYY-MM-DD - Courrier sortant', () => {
    const filename = generateDocxFilename()
    expect(filename).toMatch(/^\d{4}-\d{2}-\d{2} - Courrier sortant$/)
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
    const result = await generateDocxFromTemplate(buffer, {
      SUBJECT: 'Objet test',
      BODY: 'Bonjour, voici le courrier.',
      ADRESSE: '20, rue des Pyramides',
      CODE_POSTAL: '21000',
      VILLE: 'Dijon'
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toBe(0x50)
    expect(result[1]).toBe(0x4b)

    const { default: PizZip } = await import('pizzip')
    const zip = new PizZip(result)
    const xml = zip.file('word/document.xml')?.asText() ?? ''
    expect(xml).toContain('Objet test')
    expect(xml).toContain('Bonjour, voici le courrier.')
    expect(xml).toContain('20, rue des Pyramides')
    expect(xml).toContain('21000')
    expect(xml).toContain('Dijon')
    const text = xml.replace(/<[^>]*>/g, '')
    expect(text).not.toMatch(/\{\{[^{}]+}}/)
  })

  it('gère un contenu multi-lignes', async () => {
    const body = 'Ligne 1\nLigne 2\nLigne 3'
    const buffer = readFileSync(TEMPLATE_PATH).buffer as ArrayBuffer
    const result = await generateDocxFromTemplate(buffer, {
      SUBJECT: 'Objet',
      BODY: body,
      ADRESSE: '',
      CODE_POSTAL: '',
      VILLE: ''
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })
})
