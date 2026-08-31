import { expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { ContextTimelineEntryHeader } from './context-timeline-entry-header'

test('rend la date avant le titre', () => {
  const html = renderToStaticMarkup(
    <ContextTimelineEntryHeader
      title="Grégoire Ensel a laissé une note"
      dateTime="2026-08-17T09:08:00"
      dateLabel="17/08/2026 · 09h08"
    />
  )

  expect(html.indexOf('17/08/2026 · 09h08')).toBeLessThan(
    html.indexOf('Grégoire Ensel a laissé une note')
  )
})

test('empile le contexte entre la date et le verbe', () => {
  const html = renderToStaticMarkup(
    <ContextTimelineEntryHeader
      title="Alice a laissé une note"
      dateTime="2026-08-21T10:00:00"
      dateLabel="21/08/2026 · 10h00"
      context="Impayés · cli-2020"
    />
  )

  expect(html.indexOf('21/08/2026 · 10h00')).toBeLessThan(html.indexOf('Impayés · cli-2020'))
  expect(html.indexOf('Impayés · cli-2020')).toBeLessThan(html.indexOf('Alice a laissé une note'))
})
