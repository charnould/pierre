import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { generateDocxFilename, generateDocxFromTemplate } from './generate-docx'

const TEMPLATE_PATH = join(
  import.meta.dir,
  '../../../../..',
  'customization',
  'skills',
  'ticket.answer-ticket',
  'template.docx'
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
      subject: 'Objet test',
      body: 'Bonjour, voici le courrier.'
    })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toBe(0x50)
    expect(result[1]).toBe(0x4b)
  })

  it('gère un contenu multi-lignes', async () => {
    const body = 'Ligne 1\nLigne 2\nLigne 3'
    const buffer = readFileSync(TEMPLATE_PATH).buffer as ArrayBuffer
    const result = await generateDocxFromTemplate(buffer, { subject: 'Objet', body })
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result.length).toBeGreaterThan(0)
  })
})
