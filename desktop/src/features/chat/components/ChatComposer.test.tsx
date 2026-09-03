import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { ChatComposer } from '@/features/chat/components/ChatComposer'
import type { ChatBootData } from '@/shared/types'

const boot: ChatBootData = {
  convId: '00000000-0000-4000-8000-000000000000',
  configId: 'default',
  dataParam: '',
  disclaimer: null,
  greeting: [],
  examples: [],
  displayableConfigs: [],
  assetId: '',
  reasoningDisplay: 'off',
  layout: 'default'
}

describe('ChatComposer attachments', () => {
  test('uses chat primitives for pending files and drop state', () => {
    const attachment = new File(['rapport'], 'rapport.pdf', { type: 'application/pdf' })
    const markup = renderToStaticMarkup(
      <ChatComposer
        boot={boot}
        status="ready"
        agentName="Pierre"
        files={[attachment]}
        previewUrls={[]}
        fileErrors={['Un autre fichier a été refusé.']}
        dropActive
        onSend={() => {}}
        onRemoveFile={() => {}}
        onFilesSent={() => {}}
        onStop={() => {}}
        onProfileSelect={() => {}}
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
