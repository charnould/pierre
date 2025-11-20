import { html } from 'hono/html'

export const view = (user) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="../assets/default/system.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://rsms.me" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link rel="stylesheet" href="../assets/core/dist/css/style.1763220692407.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk&display=swap"
          rel="stylesheet"
        />
        <title>PIERRE — Console</title>
      </head>

      <body class="mt-20 ml-20 w-4xl min-w-4xl bg-stone-50 font-mono">
        <p class="mb-6 block w-fit rounded-full bg-teal-200 px-4 py-2 pr-4 text-xl font-medium">
          PIERRE-IA.org
        </p>

        <a
          href="a/conversations"
          ${user.role === 'administrator'
            ? html`class="block cursor-pointer text-7xl font-extrabold mb-1 hover:underline
                hover:underline-offset-4"`
            : html`class="block text-7xl font-extrabold mb-1 cursor-not-allowed text-neutral-400"`}
          >Conversations</a
        >

        <a
          href="a/knowledge"
          ${user.role === 'administrator' || user.role === 'contributor'
            ? html`class="block cursor-pointer text-7xl font-extrabold mb-1 hover:underline
                hover:underline-offset-4"`
            : html`class="block text-7xl font-extrabold mb-1 cursor-not-allowed text-neutral-400"`}
          >Encyclopédie</a
        >

        <a
          href="a/statistics"
          ${user.role === 'administrator'
            ? html`class="block cursor-pointer text-7xl font-extrabold mb-1 hover:underline
                hover:underline-offset-4"`
            : html`class="block text-7xl font-extrabold mb-1 cursor-not-allowed text-neutral-400"`}
          >Statistiques</a
        >
        <a
          href="a/users"
          ${user.role === 'administrator'
            ? html`class="block cursor-pointer text-7xl font-extrabold mb-1 hover:underline
                hover:underline-offset-4"`
            : html`class="block text-7xl font-extrabold mb-1 cursor-not-allowed text-neutral-400"`}
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
