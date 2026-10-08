import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { TicketsTableSkeleton } from './TicketsTableSkeleton'

describe('TicketsTableSkeleton', () => {
  test('garde le même en-tête sticky que la DualTable', () => {
    const markup = renderToStaticMarkup(
      <TicketsTableSkeleton columns={[{ name: 'id_reclamation', type: 'TEXT' }]} />
    )

    expect(markup).toContain('sticky top-0')
    expect(markup).toContain('data-variant="board"')
  })
})
