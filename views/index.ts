import { html } from 'hono/html'
import type { Config } from '../utils/_schema'

export const view = (config: Config) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <link rel="stylesheet" href="../assets/_default/design.css" />
        <link rel="stylesheet" href="../assets/${config.id}/design.css" />
        <link rel="manifest" href="../assets/${config.id}/manifest.json" />
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <script defer src="../assets/script.js"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <title>PIERRE — Une IA au service du mouvement HLM</title>
      </head>

      <body>
        <main>
          <div data-role="system__logo">${config.assistant}</div>
          <div data-role="system">
            ${config.greeting.map((g: string) => html`<p>${g}</p>`)}
          </div>

          <div data-role="example">
            <p>EXEMPLES</p>
            ${config.examples.map((eg: string) => html`<button>${eg}</button>`)}
          </div>
        </main>

        <footer>
          <input
            id="prompt__input"
            type="text"
            name="message"
            placeholder="Poser une question..."
          />
          <input id="prompt__submit" type="button" value="➔" />
        </footer>
      </body>
    </html>`
}
