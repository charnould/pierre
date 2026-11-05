import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { RepaymentDocuments, StoredMark, TemplateOptionLabel } from './SetupPanel'

describe('StoredMark', () => {
  test('names the stored piece', () => {
    const html = renderToStaticMarkup(<StoredMark name="Configuration, enregistrée" />)
    expect(html).toContain('Configuration, enregistrée')
    expect(html).toContain('lucide-circle-check')
    expect(html).not.toContain('lucide-circle ')
  })
})

describe('TemplateOptionLabel', () => {
  test('names a stored message template and leaves the others unmarked', () => {
    const stored = renderToStaticMarkup(<TemplateOptionLabel name="note.md" stored />)
    const missing = renderToStaticMarkup(<TemplateOptionLabel name="relance.md" stored={false} />)
    expect(stored).toContain('Modèle note.md, enregistré')
    expect(stored).toContain('lucide-circle-check')
    expect(missing).toContain('relance.md')
    expect(missing).not.toContain('lucide-circle-check')
    expect(missing).not.toContain('enregistré')
  })
})

describe('RepaymentDocuments', () => {
  test('lists the four documents and checks only the stored row', () => {
    const html = renderToStaticMarkup(
      <RepaymentDocuments stored={new Set(['repayment/plan.docx'])} onFile={() => {}} />
    )
    expect(html).toContain('Documents')
    expect(html).toContain('Plan d’apurement')
    expect(html).toContain('Protocole de cohésion sociale')
    expect(html).toContain('Diagnostic social et financier')
    expect(html).toContain('Courrier standard')
    expect(html).toContain('Plan d’apurement, enregistré')
    expect(html).not.toContain('Protocole de cohésion sociale, enregistré')
    expect(html).not.toContain('Avancement')
    expect(html.split('lucide-circle-check').length - 1).toBe(1)
  })
})
