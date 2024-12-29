import { html } from 'hono/html'

export const view = (user) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/@hotwired/turbo@8.0.12/dist/turbo.es2017-umd.js"></script>
        <link rel="icon" href="../assets/pierre-ia.org/system.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="../assets/pierre-ia.org/dist/css/style.1735485356876.css" />
        <title>PIERRE — Administration</title>
      </head>

      <body class="w-[900px] p-20">
        <h2 class="mb-10 text-4xl font-medium">Bonjour 🖐️</h2>

        <a
          href="a/encyclopedia"
          class="block cursor-pointer text-7xl font-bold hover:underline hover:underline-offset-4"
          >Encyclopédie</a
        >

        <a
          href="a/conversations"
          ${user.role === 'administrator'
            ? html`class="block cursor-pointer text-7xl font-bold hover:underline
              hover:underline-offset-4"`
            : html`class="block cursor-not-allowed text-7xl font-bold text-neutral-400"`}
          >Conversations</a
        >

        <a
          href="a/statistics"
          ${user.role === 'administrator'
            ? html`class="block cursor-pointer text-7xl font-bold hover:underline
              hover:underline-offset-4"`
            : html`class="block cursor-not-allowed text-7xl font-bold text-neutral-400"`}
          >Statistiques</a
        >
        <a
          href="a/users"
          ${user.role === 'administrator'
            ? html`class="block cursor-pointer text-7xl font-bold hover:underline
              hover:underline-offset-4"`
            : html`class="block cursor-not-allowed text-7xl font-bold text-neutral-400"`}
          >Utilisateurs</a
        >

        <form method="post" action="a/login">
          <button
            class="mt-20 cursor-pointer text-sm font-medium underline decoration-2 underline-offset-4"
            value="logout"
            name="action"
          >
            Se déconnecter
          </button>
        </form>

        <p class="mt-6 text-sm">
          Une question ou remarque sur ce projet <span class="font-bold">open-source</span> ?<br />
          Adressez un email à <span class="font-bold">charnould@pierre-ia.org</span>.
        </p>
      </body>
    </html>`
}
