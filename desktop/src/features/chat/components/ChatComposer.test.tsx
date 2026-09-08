import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { ChatComposer } from '@/features/chat/components/ChatComposer'

describe('ChatComposer attachments', () => {
  test('uses chat primitives for pending files and drop state', () => {
    const attachment = new File(['rapport'], 'rapport.pdf', { type: 'application/pdf' })
    const markup = renderToStaticMarkup(
      <ChatComposer
        status="ready"
        files={[attachment]}
        previewUrls={[]}
        fileErrors={['Un autre fichier a été refusé.']}
        dropActive
        onSend={() => {}}
        onRemoveFile={() => {}}
        onFilesSent={() => {}}
        onStop={() => {}}
      />
    )

    expect(markup).toContain('data-drop-active="true"')
    expect(markup).toContain('data-slot="input-group"')
    expect(markup).toContain('data-slot="item-group"')
    expect(markup).toContain('rapport.pdf')
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('aria-label="Retirer rapport.pdf"')
    expect(markup).not.toContain('aria-label="Envoyer" disabled')
  })
})
