import { describe, expect, it } from 'bun:test'

import { benchHtml } from './carl-page.ts'

describe('bench CARL', () => {
  it('calls the public agent and reads the data envelope', () => {
    const html = benchHtml()
    expect(html).toContain('https://agent.pierre-ia.org/carl')
    expect(html).toContain('payload.data.output')
    expect(html).toContain('payload.data.milliseconds')
    expect(html).not.toContain('localhost')
    expect(html).not.toContain('/api/models/carl')
  })
})
