import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { Badge } from './badge'

describe('Badge', () => {
  test('renders its label', () => {
    const html = renderToStaticMarkup(<Badge variant="outline">Urgent</Badge>)
    expect(html).toContain('Urgent')
    expect(html).toContain('border-border')
  })
})
