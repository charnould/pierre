import { html } from 'hono/html'

export const view = (message) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/@hotwired/turbo@8.0.12/dist/turbo.es2017-umd.js"></script>
        <link rel="icon" href="../assets/pierre-ia.org/system.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="../assets/pierre-ia.org/dist/css/style.1731159647797.css" />
        <title>PIERRE — Administration > Connexion</title>
      </head>

      <body class="m-20">
        ${message
          ? html`<p class="mb-4 w-fit rounded-lg bg-red-100 px-4 py-1 text-red-500">${message}</p>`
          : null}

        <form method="post" class="flex w-[500px] flex-col gap-y-4">
          <input type="hidden" name="action" value="login" />

          <input
            type="email"
            name="email"
            required
            placeholder="charnould@pierre-ia.org"
            class="rounded-lg border-1 border-neutral-300 p-4 text-4xl"
          />

          <input
            type="password"
            name="password"
            required
            placeholder="Mot de passe (vN}3bQ3_iG)"
            class="rounded-lg border-1 border-neutral-300 p-4 text-4xl"
          />

          <input
            type="submit"
            value="Connexion →"
            class="cursor-pointer rounded-lg bg-neutral-900 p-4 text-4xl font-medium text-white"
          />
        </form>
      </body>
    </html>`
}
