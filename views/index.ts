import { html } from 'hono/html'
import type { Config } from '../utils/_schema'

export const view = (config: Config, context: string) => {
  return html`<!doctype html>
    <html lang="fr" class="no-scrollbar">
      <head>
        <meta charset="UTF-8" />
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="../assets/${config.id}/system.svg" type="image/svg+xml" />
        <link rel="manifest" href="../assets/${config.id}/manifest.json" />
        <link rel="stylesheet" href="../assets/pierre-ia.org/dist/css/style.1741441117471.css" />
        <script type="module" src="../assets/pierre-ia.org/dist/js/ai.1741441117471.js"></script>
        <title>Comment puis-je vous aider ? 🖐️</title>
      </head>

      <body class="bg-white tracking-[-0.1px] antialiased">
        <main class="mx-auto flex max-w-4xl flex-col px-8 pb-32">
          ${config.context[context].disclaimer === null
            ? null
            : html` <input
                type="hidden"
                id="disclaimer"
                value="${config.context[context].disclaimer}"
              />`}

          <img
            class="mt-6 mb-1"
            src="../assets/${config.id}/system.svg"
            height="26"
            width="26"
            alt="AI"
          />
          <div class="prose" data-role="system">
            ${config.context[context].greeting.map((g: string) => html`<p>${g}</p>`)}
          </div>

          <div data-role="example">
            <p class="mt-4 mb-2 text-xs font-semibold text-gray-600">EXEMPLES</p>
            ${config.context[context].examples.map(
              (eg: string) =>
                html`<button
                  class="mb-2 block w-fit max-w-95/100 cursor-pointer rounded border border-gray-300 px-3 py-2 text-left font-serif text-sm text-gray-800 hover:bg-gray-50 disabled:cursor-progress"
                >
                  ${eg}
                </button>`
            )}
          </div>
        </main>

        <footer
          class="fixed bottom-0 left-1/2 w-full max-w-4xl -translate-x-1/2 transform bg-white shadow-[0_0_40px_40px_rgba(255,255,255,1)]"
        >
          <div
            class="mx-8 mb-8 flex h-fit flex-none items-center justify-between gap-x-2 rounded-lg border border-gray-200 bg-white py-3 pr-2 pl-4 shadow-sm"
          >
            <textarea
              class="field-sizing-content flex-1 resize-none border-none text-base outline-0 placeholder:text-gray-400"
              id="prompt__input"
              type="text"
              name="message"
              placeholder="Comment puis-je vous aider ?"
            ></textarea>
            <button
              class="h-8 cursor-pointer px-2 text-xl font-black hover:rounded-lg hover:bg-gray-100 disabled:cursor-progress disabled:border-stone-200 disabled:text-stone-400"
              id="prompt__submit"
              type="button"
            >
              <svg
                class="fill-gray-600"
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 16 16"
                width="16"
                height="16"
              >
                <path
                  d="M.989 8 .064 2.68a1.342 1.342 0 0 1 1.85-1.462l13.402 5.744a1.13 1.13 0 0 1 0 2.076L1.913 14.782a1.343 1.343 0 0 1-1.85-1.463L.99 8Zm.603-5.288L2.38 7.25h4.87a.75.75 0 0 1 0 1.5H2.38l-.788 4.538L13.929 8Z"
                ></path>
              </svg>
            </button>
          </div>
        </footer>
      </body>
    </html>`
}
