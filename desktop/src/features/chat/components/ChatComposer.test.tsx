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
    expect(markup).toContain('title="rapport.pdf"')
    expect(markup).toContain('>rapport<')
    expect(markup).toContain('PDF')
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('aria-label="Retirer rapport.pdf"')
    expect(markup).not.toContain('aria-label="Envoyer" disabled')
    expect(markup).not.toContain('Joindre un fichier')
    expect(markup).toContain('ring-1')
    expect(markup).toContain('focus-visible]:ring-0')
  })

  test('shows a paperclip when attachments are enabled', () => {
    const markup = renderToStaticMarkup(
      <ChatComposer
        status="ready"
        files={[]}
        previewUrls={[]}
        fileErrors={[]}
        dropActive={false}
        allowAttachments
        onSend={() => {}}
        onAddFiles={() => {}}
        onRemoveFile={() => {}}
        onFilesSent={() => {}}
        onStop={() => {}}
      />
    )
    expect(markup).toContain('Joindre un fichier')
    expect(markup).toContain('type="file"')
    expect(markup).toContain('rows="3"')
    expect(markup).toContain('leading-5')
    expect(markup).toContain('text-start')
    expect(markup).toContain('flex-col')
    expect(markup).not.toContain('items-end')
    expect(markup).not.toContain('pb-1.5')
  })

  test('autofocuses unless told not to', () => {
    const focused = renderToStaticMarkup(
      <ChatComposer
        status="ready"
        files={[]}
        previewUrls={[]}
        fileErrors={[]}
        dropActive={false}
        autoFocus
        onSend={() => {}}
        onRemoveFile={() => {}}
        onFilesSent={() => {}}
        onStop={() => {}}
      />
    )
    const idle = renderToStaticMarkup(
      <ChatComposer
        status="ready"
        files={[]}
        previewUrls={[]}
        fileErrors={[]}
        dropActive={false}
        onSend={() => {}}
        onRemoveFile={() => {}}
        onFilesSent={() => {}}
        onStop={() => {}}
      />
    )
    expect(focused).toContain('autofocus')
    expect(idle).not.toContain('autofocus')
  })

  test('uses the default invitation placeholder unless an example is previewed', () => {
    const idle = renderToStaticMarkup(
      <ChatComposer
        status="ready"
        files={[]}
        previewUrls={[]}
        fileErrors={[]}
        dropActive={false}
        onSend={() => {}}
        onRemoveFile={() => {}}
        onFilesSent={() => {}}
        onStop={() => {}}
      />
    )
    const previewed = renderToStaticMarkup(
      <ChatComposer
        status="ready"
        files={[]}
        previewUrls={[]}
        fileErrors={[]}
        dropActive={false}
        placeholder="Comment déposer mon préavis ?"
        onSend={() => {}}
        onRemoveFile={() => {}}
        onFilesSent={() => {}}
        onStop={() => {}}
      />
    )
    expect(idle).toContain('Comment puis-je vous aider aujourd&#x27;hui ?')
    expect(idle).not.toContain('data-example-preview')
    expect(previewed).toContain('Comment déposer mon préavis ?')
    expect(previewed).toContain('data-example-preview')
    expect(previewed).not.toContain('Comment puis-je vous aider aujourd&#x27;hui ?')
  })
})
