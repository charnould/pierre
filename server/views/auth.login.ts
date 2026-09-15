import { html } from 'hono/html'

export const view = (redirect: string) => html`<!doctype html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="color-scheme" content="light" />
      <link rel="icon" href="/branding/system.svg" type="image/svg+xml" />
      <link rel="stylesheet" href="../assets/dist/css/style.1789501959414.css" />
      <script type="module" src="../assets/dist/js/auth-login.1789501959414.js"></script>
      <title>Connexion — PIERRE</title>
    </head>
    <body class="bg-background text-foreground grid min-h-screen place-items-center p-4">
      <main class="w-full max-w-sm">
        <form id="login-form" class="flex flex-col gap-4" data-redirect="${redirect}" novalidate>
          <h1 class="sr-only">Connexion</h1>
          <img src="/branding/system.svg" alt="" aria-hidden="true" class="mx-auto h-16 w-auto" />

          <div class="flex flex-col gap-2">
            <label for="email" class="text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              placeholder="votre@email.com"
              class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/40 h-8 rounded-md border px-3 text-sm outline-none focus-visible:ring-1"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="password" class="text-sm font-medium">Mot de passe</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              placeholder="••••••••"
              class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/40 h-8 rounded-md border px-3 text-sm outline-none focus-visible:ring-1"
            />
            <p id="login-error" role="alert" class="text-destructive hidden text-xs"></p>
          </div>

          <button
            id="login-submit"
            type="submit"
            class="bg-primary text-primary-foreground focus-visible:ring-ring/40 h-8 w-fit cursor-pointer rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-1 disabled:cursor-default disabled:opacity-50"
          >
            Se connecter
          </button>
        </form>
      </main>
    </body>
  </html>`
