import { html } from 'hono/html'

export const view = (params: { config: string }) =>
  html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="/assets/dist/css/pierre-embed-frame.css" />
        <link rel="stylesheet" href="/assets/dist/css/pierre-embed-modal.css" />
        <script src="/assets/dist/js/pierre-embed.js"></script>
      </head>
      <body data-pierre-config="${params.config}"></body>
    </html>`
