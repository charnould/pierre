import { describe, expect, it } from 'bun:test'

import * as XLSX from 'xlsx'

import {
  inspectWorkbook,
  parseKnowledgeUpload,
  parseWorkbook
} from '../../../utils/knowledge/parse-upload'

const toBytes = (book: XLSX.WorkBook): Uint8Array =>
  new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }))

const workbook = (sheets: Array<[string, unknown[][]]>) => {
  const book = XLSX.utils.book_new()
  for (const [name, rows] of sheets) {
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name)
  }
  return toBytes(book)
}

describe('parseKnowledgeUpload', () => {
  it('accepts a header-only sheet and ignores an empty one', () => {
    const sheets = parseWorkbook(
      workbook([
        ['Vide', []],
        ['Données', [['nom', 'valeur']]]
      ])
    )
    expect(sheets).toMatchObject([
      {
        name: 'Données',
        headerRow: 1,
        columns: ['nom', 'valeur'],
        rows: []
      }
    ])
  })

  it('automatically unmerges vertical and horizontal merges and drops pure spacer columns', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Titre global', null, null, null],
      ['Catégorie', 'Désignation', null, 'Qté'],
      ['Eau', 'Rouleau téflon', null, 2],
      [null, 'Rubalise', null, 5]
    ])
    sheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },
      { s: { r: 2, c: 0 }, e: { r: 3, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } },
      { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } }
    ]
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Garage')
    const bytes = toBytes(book)

    const sheets = parseWorkbook(bytes, {
      specs: [{ sheetName: 'Garage', headerRow: 2 }]
    })
    expect(sheets[0]).toMatchObject({
      name: 'Garage',
      headerRow: 2,
      columns: ['categorie', 'designation', 'qte'],
      rows: [
        { categorie: 'eau', designation: 'rouleau téflon', qte: 2 },
        { categorie: 'eau', designation: 'rubalise', qte: 5 }
      ]
    })
  })

  it('handles vertical header merges with exact spacer filtering', () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Suivi des marchés'],
      ['Nom', 'Référent', null],
      [null, 'Secteur A', 'Secteur B'],
      ['Couverture', 'Alice', null]
    ])
    sheet['!merges'] = [
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
      { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } },
      { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } }
    ]
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Marchés')
    const sheets = parseWorkbook(toBytes(book), {
      specs: [{ sheetName: 'Marchés', headerRow: 3 }]
    })
    expect(sheets[0]).toMatchObject({
      columns: ['nom', 'secteur_a', 'secteur_b'],
      rows: [{ nom: 'couverture', secteur_a: 'alice', secteur_b: 'alice' }]
    })
  })

  it('preserves real 1-based Excel row numbers even when !ref starts below row 1', () => {
    const sheet: XLSX.WorkSheet = {
      '!ref': 'A3:B4',
      A3: { t: 's', v: 'Code' },
      B3: { t: 's', v: 'Taux' },
      A4: { t: 's', v: 'RES-1' },
      B4: { t: 'n', v: 0.25 }
    }
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Vacance')
    const bytes = toBytes(book)

    const inspected = inspectWorkbook(bytes)
    expect(inspected[0]?.totalRows).toBe(4)
    expect(inspected[0]?.rows[2]?.rowNumber).toBe(3)
    expect(inspected[0]?.rows[2]?.cells.map((cell) => cell.value)).toEqual(['Code', 'Taux'])

    const parsed = parseWorkbook(bytes, {
      specs: [{ sheetName: 'Vacance', headerRow: 3 }]
    })
    expect(parsed[0]?.rows).toEqual([{ code: 'res-1', taux: 0.25 }])
  })

  it('keeps headerHash stable when a banner above headerRow changes and rejects shifted or renamed headers', () => {
    const v1 = workbook([
      ['Patrimoine', [['Extraction janvier 2026'], ['Code', 'Nom'], ['A1', 'Résidence A']]]
    ])
    const v2 = workbook([
      [
        'Patrimoine',
        [['Extraction février 2026'], ['Code', 'Nom'], ['A1', 'Résidence A'], ['A2', 'Résidence B']]
      ]
    ])
    const v3 = workbook([
      ['Patrimoine', [['Extraction mars 2026'], ['Code', 'Libellé'], ['A1', 'Résidence A']]]
    ])

    const first = parseWorkbook(v1, {
      specs: [{ sheetName: 'Patrimoine', headerRow: 2 }]
    })[0]!
    const second = parseWorkbook(v2, {
      specs: [
        {
          sheetName: 'Patrimoine',
          headerRow: 2,
          expectedHeaderHash: first.headerHash
        }
      ]
    })[0]!
    expect(second.headerHash).toBe(first.headerHash)
    expect(second.contentHash).not.toBe(first.contentHash)

    expect(() =>
      parseWorkbook(v3, {
        specs: [
          {
            sheetName: 'Patrimoine',
            headerRow: 2,
            expectedHeaderHash: first.headerHash
          }
        ]
      })
    ).toThrow(/ont changé/)
  })

  it('rejects untitled columns with data, duplicate headers with column letters, and empty workbooks', () => {
    expect(() =>
      parseWorkbook(
        workbook([
          [
            'Trous',
            [
              ['nom', null],
              ['alpha', 'sans-titre']
            ]
          ]
        ])
      )
    ).toThrow(expect.objectContaining({ code: 'invalid_spreadsheet_header' }))

    expect(() => parseWorkbook(workbook([['Doublons', [['Nom', 'nom']]]]))).toThrow(
      expect.objectContaining({ code: 'duplicate_spreadsheet_header' })
    )

    expect(() => parseWorkbook(workbook([['Vide', [[]]]]))).toThrow(
      expect.objectContaining({ code: 'empty_workbook' })
    )
  })

  it('rejects a corrupt docx file with invalid_file', async () => {
    await expect(
      parseKnowledgeUpload('docx', new TextEncoder().encode('not a zip'))
    ).rejects.toMatchObject({ code: 'invalid_file' })
  })
})
