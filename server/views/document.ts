import { html } from 'hono/html'

import { chatCss } from './assets'

const VIEWPORT =
  'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'

export function htmlPage(params: {
  title: string
  bodyClass?: string
  head?: ReturnType<typeof html>
  body: ReturnType<typeof html>
}) {
  return html`<!doctype html>
    <html lang="fr" class="scroll-smooth antialiased">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="${VIEWPORT}" />
        <link rel="stylesheet" href="${chatCss}" />
        ${params.head ?? html``}
        <link rel="icon" href="/branding/system.svg" type="image/svg+xml" />
        <title>${params.title}</title>
      </head>
      <body class="${params.bodyClass ?? ''}">
        ${params.body}
      </body>
    </html>`
}
