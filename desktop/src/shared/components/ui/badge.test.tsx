import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { colorizeBadgeBorder } from '@/shared/lib/ui-settings/tickets-table'

import { Badge } from './badge'

describe('Badge', () => {
  test('owns dynamic data colors without a wrapper', () => {
    const border = colorizeBadgeBorder('#FFD600', '#5C4A18')
    const html = renderToStaticMarkup(
      <Badge
        appearance={{
          background: '#FFD600',
          color: '#5C4A18',
          border,
          fontWeight: 500
        }}
      >
        Urgent
      </Badge>
    )

    expect(html).toContain('background-color:#FFD600')
    expect(html).toContain('color:#5C4A18')
    expect(html).toContain(`border-color:${border}`)
    expect(html).toContain('font-weight:500')
  })
})
