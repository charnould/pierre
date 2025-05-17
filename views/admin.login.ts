import { html } from 'hono/html'

export const view = (message) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/@hotwired/turbo@8.0.12/dist/turbo.es2017-umd.js"></script>
        <link rel="icon" href="../assets/default/system.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://rsms.me" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link rel="stylesheet" href="../assets/default/dist/css/style.1747471633665.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk&display=swap"
          rel="stylesheet"
        />
        <title>PIERRE — Console</title>
      </head>

      <body class="m-20">
        ${message
          ? html`<p class="mb-4 w-fit rounded-lg bg-red-100 px-4 py-1 text-red-500">${message}</p>`
          : null}

        <form method="post" class="flex w-[500px] flex-col gap-y-4">
          <input type="hidden" name="action" value="login" />

          <input
            required
            type="email"
            name="email"
            autocomplete="current-email"
            placeholder="charnould@pierre-ia.org"
            class="rounded-lg border-1 border-neutral-300 p-4 text-4xl"
          />

          <input
            required
            type="password"
            name="password"
            autocomplete="current-password"
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
