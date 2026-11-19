import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import PizZip from 'pizzip'

import { REPAYMENT_DOCUMENT_TAGS } from '../../../../shared/repayment-document-fields'
import {
  MAX_REPAYMENT_TEMPLATE_BYTES,
  renderRepaymentDocument,
  repaymentDocumentTags,
  repaymentTemplateIssue
} from '../../../utils/repayment-documents'
import { filledChronology, filledRepaymentCaseFile } from '../../repayment-document-fixture'

const templates = join(import.meta.dir, '../../../../docs/04-core-intelligence-hlm/templates')
const caseFile = filledRepaymentCaseFile()

const template = (name: string) =>
  new Uint8Array(readFileSync(join(templates, `Impayés - docx - ${name}.docx`)))

const xmlOf = (bytes: Uint8Array) => new PizZip(bytes).file('word/document.xml')!.asText()

describe('documents d’apurement', () => {
  it('remplit les trois modèles sans imprimer les lignes vides', async () => {
    const diagnostic = await renderRepaymentDocument({
      document: 'diagnostic',
      format: 'docx',
      caseFile,
      template: template('Diagnostic social et financier'),
      email: 'ada@example.org',
      now: new Date('2026-11-06T12:00:00Z'),
      chronology: filledChronology,
      stage: 'Recouvrement amiable'
    })
    const diagnosticXml = xmlOf(diagnostic.bytes)
    expect(diagnostic.filename).toBe('Diagnostic social et financier.docx')
    expect(diagnosticXml).toContain('Perte d’emploi')
    expect(diagnosticXml).toContain('1 200,00')
    expect(diagnosticXml).toContain('01/01/2020')
    expect(diagnosticXml).toContain('CCAS')
    expect(diagnosticXml).not.toContain('{{')
    expect(diagnosticXml).not.toContain('CLAUSE_SOLIDARITE')

    const plan = await renderRepaymentDocument({
      document: 'plan',
      format: 'docx',
      caseFile,
      template: template("Plan d'apurement"),
      email: 'ada@example.org',
      now: new Date('2026-11-06T12:00:00Z'),
      chronology: filledChronology,
      stage: 'Recouvrement amiable'
    })
    const planXml = xmlOf(plan.bytes)
    expect(planXml).toContain('Ada')
    expect(planXml).toContain('Lovelace')
    expect(planXml).toContain('Prime exceptionnelle')
    expect(planXml).toContain('04/2026')
    expect(planXml).toContain('01/06/2026')
    expect(planXml).toContain('100,00')
    expect(planXml).toContain('1 200,00')
    expect(planXml).toContain('ada@example.org')
    expect(planXml).not.toContain('{{')

    const protocole = await renderRepaymentDocument({
      document: 'protocole',
      format: 'docx',
      caseFile,
      template: template('Protocole de cohésion sociale'),
      email: 'ada@example.org',
      now: new Date('2026-11-06T12:00:00Z'),
      chronology: filledChronology,
      stage: 'Recouvrement amiable'
    })
    const protocoleXml = xmlOf(protocole.bytes)
    expect(protocoleXml).toContain('01/06/2026')
    expect(protocoleXml).toContain('Santé')
    expect(protocoleXml).toContain('Prime exceptionnelle')
    expect(protocoleXml).not.toContain('{{')
    for (const xml of [diagnosticXml, planXml, protocoleXml]) assertValidWordDocumentXml(xml)
  })

  it('refuse d’exporter quand une balise du modèle n’est pas renseignée', async () => {
    const incomplete = filledRepaymentCaseFile()
    incomplete.donnees_communes.bail.debut_bail = null
    await expect(
      renderRepaymentDocument({
        document: 'diagnostic',
        format: 'docx',
        caseFile: incomplete,
        template: template('Diagnostic social et financier'),
        email: 'ada@example.org',
        chronology: filledChronology,
        stage: 'Recouvrement amiable'
      })
    ).rejects.toThrow('Il manque : Début du bail.')
  })

  it('accepte dans chaque modèle un sous-ensemble des balises du formulaire', () => {
    const catalog = new Set<string>(REPAYMENT_DOCUMENT_TAGS)
    for (const [id, name] of [
      ['repayment/diagnostic.docx', 'Diagnostic social et financier'],
      ['repayment/plan.docx', "Plan d'apurement"],
      ['repayment/protocole.docx', 'Protocole de cohésion sociale']
    ] as const) {
      const bytes = template(name)
      expect(repaymentTemplateIssue(id, bytes)).toBeNull()
      assertValidWordDocumentXml(xmlOf(bytes))
      const tags = repaymentDocumentTags(bytes) ?? []
      expect(tags.length).toBeGreaterThan(0)
      expect(tags.filter((tag) => !catalog.has(tag))).toEqual([])
    }
  })

  it('convertit le diagnostic en PDF sans police distante', async () => {
    const pdf = await renderRepaymentDocument({
      document: 'diagnostic',
      format: 'pdf',
      caseFile,
      template: template('Diagnostic social et financier'),
      email: 'ada@example.org',
      now: new Date('2026-11-06T12:00:00Z'),
      chronology: filledChronology,
      stage: 'Recouvrement amiable'
    })
    expect(pdf.mimeType).toBe('application/pdf')
    expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('accepte un dépôt technique trop court et refuse un modèle incomplet', () => {
    expect(
      repaymentTemplateIssue('repayment/plan.docx', new Uint8Array([0x50, 0x4b, 0x03, 0x04]))
    ).toBeNull()
    const huge = new Uint8Array(MAX_REPAYMENT_TEMPLATE_BYTES + 1)
    huge[0] = 0x50
    expect(repaymentTemplateIssue('repayment/plan.docx', huge)).toBe('Le modèle Word dépasse 5 Mo.')
    const zip = new PizZip()
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    )
    zip
      .folder('_rels')
      ?.file(
        '.rels',
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
      )
    zip
      .folder('word')
      ?.file(
        'document.xml',
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman"/></w:rPr><w:t>{{INCONNUE}}</w:t></w:r></w:p></w:body></w:document>'
      )
    const bytes = zip.generate({ type: 'uint8array' })
    expect(repaymentTemplateIssue('repayment/diagnostic.docx', bytes)).toContain('{{')
  })
})

type XmlNode = { name: string; attrs: string; children: XmlNode[] }

function parseXmlTree(xml: string): XmlNode {
  const root: XmlNode = { name: '#root', attrs: '', children: [] }
  const stack = [root]
  for (const token of xml.matchAll(
    /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<(\/?)([A-Za-z0-9:_-]+)([^>]*?)(\/?)>/g
  )) {
    const closing = token[1] === '/'
    const name = token[2]
    const attrs = token[3] ?? ''
    const selfClosing = token[4] === '/'
    if (!name) continue
    if (closing) {
      const opened = stack.pop()
      expect(opened?.name).toBe(name)
      continue
    }
    const node: XmlNode = { name, attrs, children: [] }
    stack.at(-1)!.children.push(node)
    if (!selfClosing) stack.push(node)
  }
  expect(stack).toHaveLength(1)
  expect(root.children).toHaveLength(1)
  return root.children[0]!
}

function walkXml(
  node: XmlNode,
  visit: (current: XmlNode, ancestors: XmlNode[]) => void,
  ancestors: XmlNode[] = []
) {
  visit(node, ancestors)
  const next = [...ancestors, node]
  for (const child of node.children) walkXml(child, visit, next)
}

function assertValidWordDocumentXml(xml: string) {
  const doc = parseXmlTree(xml)
  expect(doc.name).toBe('w:document')
  const body = doc.children.find((child) => child.name === 'w:body')
  expect(body).toBeDefined()
  const bodyChildren = body!.children
  expect(bodyChildren.at(-1)?.name).toBe('w:sectPr')
  for (const child of bodyChildren.slice(0, -1)) {
    expect(['w:p', 'w:tbl']).toContain(child.name)
  }
  walkXml(doc, (node, ancestors) => {
    if (node.name === 'w:p' || node.name === 'w:tbl') {
      expect(ancestors.some((ancestor) => ancestor.name === 'w:p')).toBe(false)
    }
    if (node.name === 'w:p') {
      node.children.forEach((child, index) => {
        if (child.name === 'w:pPr') expect(index).toBe(0)
      })
    }
    if (node.name === 'w:tbl') {
      expect(node.children[0]?.name).toBe('w:tblPr')
      expect(node.children[1]?.name).toBe('w:tblGrid')
      const cols = node.children[1]!.children.filter((child) => child.name === 'w:gridCol').length
      expect(cols).toBeGreaterThan(0)
      for (const row of node.children.slice(2)) {
        expect(row.name).toBe('w:tr')
        const cells = row.children.filter((child) => child.name === 'w:tc')
        const span = cells.reduce((total, cell) => {
          const tcPr = cell.children[0]
          expect(tcPr?.name).toBe('w:tcPr')
          expect(cell.children.some((child) => child.name === 'w:p')).toBe(true)
          const gridSpan = tcPr?.children.find((child) => child.name === 'w:gridSpan')
          const val = Number(/w:val="(\d+)"/.exec(gridSpan?.attrs ?? '')?.[1] ?? 1)
          return total + val
        }, 0)
        expect(span).toBe(cols)
      }
    }
  })
}
