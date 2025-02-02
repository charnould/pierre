import { html } from 'hono/html'
import type { Config } from '../utils/_schema'

export const view = (config: Config, context: string) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="../assets/${config.id}/system.svg" type="image/svg+xml" />
        <link rel="manifest" href="../assets/${config.id}/manifest.json" />
        <link rel="stylesheet" href="../assets/pierre-ia.org/dist/css/style.1738501854356.css" />
        <script type="module" src="../assets/pierre-ia.org/dist/js/ai.1738501854356.js"></script>
        <title>Comment puis-je vous aider ? 🖐️</title>
      </head>

      <body class="mx-auto flex h-dvh max-w-4xl flex-col bg-white px-6">
        ${config.context[context].disclaimer === null
          ? null
          : html` <input
              type="hidden"
              id="disclaimer"
              value="${config.context[context].disclaimer}"
            />`}

        <main class="no-scrollbar flex-1 overflow-scroll pb-12">
          <div class="clear-both flex gap-2 pt-6 pb-2" data-role="system__logo">
            <img src="../assets/${config.id}/system.svg" height="26" width="26" alt="AI" />
          </div>
          <div class="prose" data-role="system">
            ${config.context[context].greeting.map((g: string) => html`<p>${g}</p>`)}
          </div>

          <div data-role="example">
            <p class="mt-4 mb-2 font-['Work_Sans'] text-xs font-semibold text-stone-500">
              EXEMPLES
            </p>
            ${config.context[context].examples.map(
              (eg: string) =>
                html`<button
                  class="mb-2 block cursor-pointer rounded border border-stone-300 px-3 py-2 text-left font-['Work_Sans'] text-sm text-stone-800 disabled:cursor-progress"
                >
                  ${eg}
                </button>`
            )}
          </div>
        </main>

        <footer
          class="mb-6 flex h-14 flex-none items-center justify-between rounded-lg border border-stone-200 bg-stone-50 pr-3 pl-5 shadow-[0_0_40px_40px_rgba(255,255,255,1)] backdrop-blur-xl"
        >
          <!-- TODO: https://tailwindcss.com/docs/v4-beta#field-sizing-utilities -->
          <input
            class="flex-1 border-none font-['Work_Sans'] text-xl outline-0"
            id="prompt__input"
            type="text"
            name="message"
            placeholder="Poser une question..."
          />
          <input
            class="h-8 w-8 cursor-pointer rounded-lg border border-stone-300 text-xl font-black disabled:cursor-progress disabled:border-stone-200 disabled:text-stone-400"
            id="prompt__submit"
            type="button"
            value="➔"
          />
        </footer>
      </body>
    </html>`
}
