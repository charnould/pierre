import { html } from 'hono/html'

export const view = () => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/@hotwired/turbo@8.0.12/dist/turbo.es2017-umd.js"></script>
        <link rel="icon" href="../assets/pierre-ia.org/system.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="../assets/pierre-ia.org/dist/css/style.1738501854356.css" />
        <title>PIERRE — Administration > Statistiques</title>
      </head>

      <body class="mx-20 my-10 w-[800px]">
        <a href="/a" class="font-medium text-blue-700">← Retour</a>
        <h1 class="mt-5 text-6xl font-bold">Statistiques</h1>
        <h2 class="mb-10 text-3xl font-medium">Bientôt</h2>
      </body>
    </html>`
}
