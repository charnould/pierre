import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { AboutAttachmentField } from './AboutAttachmentField'

describe('AboutAttachmentField', () => {
  test('renders selected files, constraints and inline errors', () => {
    const file = new File(['contexte'], 'contexte.pdf', { type: 'application/pdf' })
    const markup = renderToStaticMarkup(
      <AboutAttachmentField
        files={[file]}
        errors={['Un fichier a été refusé.']}
        disabled={false}
        onAddFiles={() => {}}
        onRemoveFile={() => {}}
      />
    )

    expect(markup).toContain('Pièces jointes')
    expect(markup).toContain('contexte.pdf')
    expect(markup).toContain('data-slot="input-group"')
    expect(markup).toContain('aria-label="Retirer contexte.pdf"')
    expect(markup).toContain('role="alert"')
  })
})
