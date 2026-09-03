import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { AboutOutputPanel } from './AboutOutputPanel'

describe('AboutOutputPanel', () => {
  test('renders result identity, agent work and typeset output', () => {
    const markup = renderToStaticMarkup(
      <AboutOutputPanel
        reasoningDisplay="full"
        workParts={[
          { type: 'thinking', contentIndex: 0, thinking: 'Analyse du dossier.' },
          {
            type: 'tool',
            contentIndex: 1,
            toolCallId: 'call-1',
            name: 'sqlite3',
            status: 'success',
            output: '1 ligne'
          }
        ]}
        reasoningDuration={2}
        isStreaming={false}
        isReasoningPhase={false}
        hasOutput
        output={'## Situation\n\nSynthèse terminée.'}
        title="Synthèse client · CLI-1"
        meta="2020–2029"
        onCopy={() => {}}
      />
    )

    expect(markup).toContain('Synthèse client · CLI-1')
    expect(markup).toContain('2020–2029')
    expect(markup).toContain('Réflexion pendant 2 secondes · 1 outil utilisé')
    expect(markup).toContain('class="typeset typeset-docs min-w-0"')
    expect(markup).toContain('<h2>Situation</h2>')
  })

  test('uses the shared animated markdown caret while streaming', () => {
    const markup = renderToStaticMarkup(
      <AboutOutputPanel
        reasoningDisplay="off"
        workParts={[]}
        isStreaming
        isReasoningPhase={false}
        hasOutput
        output="Synthèse en cours"
        title="Synthèse lot · LOT-1"
        meta={null}
        onCopy={() => {}}
      />
    )

    expect(markup).toContain('generated-stream-caret')
    expect(markup).toContain('data-pierre-stream-animate="true"')
  })
})
