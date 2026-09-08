import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { AgentWorkTrace, type AgentWorkPart } from './AgentWorkTrace'

const parts: AgentWorkPart[] = [
  { type: 'thinking', contentIndex: 0, thinking: 'Analyse du dossier.' },
  {
    type: 'tool',
    contentIndex: 1,
    toolCallId: 'call-1',
    name: 'sqlite3',
    status: 'success',
    output: '1 ligne'
  }
]

describe('AgentWorkTrace', () => {
  test('hides the whole trace in none mode', () => {
    const markup = renderToStaticMarkup(
      <AgentWorkTrace parts={parts} display="none" active={false} duration={2} />
    )
    expect(markup).toBe('')
  })

  test('shows tools only in tools mode', () => {
    const markup = renderToStaticMarkup(
      <AgentWorkTrace parts={parts} display="tools" active={false} duration={2} />
    )
    expect(markup).toContain('1 outil utilisé')
    expect(markup).not.toContain('Analyse du dossier.')
    expect(markup).not.toContain('Réflexion pendant')
  })

  test('keeps collapsed traces closed', () => {
    const markup = renderToStaticMarkup(
      <AgentWorkTrace parts={parts} display="collapsed" active={false} duration={2} />
    )
    expect(markup).toContain('Réflexion pendant 2 secondes · 1 outil utilisé')
    expect(markup).not.toContain('data-open')
  })

  test('keeps expanded traces open after the turn ends', () => {
    const markup = renderToStaticMarkup(
      <AgentWorkTrace parts={parts} display="expanded" active={false} duration={2} />
    )
    expect(markup).toContain('Réflexion pendant 2 secondes · 1 outil utilisé')
    expect(markup).toContain('Analyse du dossier.')
  })
})
