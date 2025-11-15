import { randomUUIDv7 } from 'bun'
import { html } from 'hono/html'
import type { Displayable_configs } from '../controllers/GET.index'
import type { Config } from '../utils/_schema'

export const view = (params: {
  active_config: Config
  displayable_configs: Displayable_configs
}) => {
  return html`<!doctype html>
    <html lang="fr" class="scroll-smooth bg-white tracking-[-0.1px] antialiased">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <link rel="preconnect" href="https://rsms.me" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link rel="stylesheet" href="../assets/default/dist/css/style.1763220692407.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inclusive+Sans:wght@350&display=swap"
          rel="stylesheet"
        />
        <link
          rel="icon"
          href="../assets/${params.active_config.id}/system.svg"
          type="image/svg+xml"
        />
        <link rel="manifest" href="../assets/${params.active_config.id}/manifest.json" />
        <script type="module" src="../assets/default/dist/js/ai.1763220692407.js"></script>
        <title>Comment puis-je vous aider ? 🖐️</title>
        <meta name="conv_id" content="${randomUUIDv7()}" />
      </head>

      <body class="mx-auto h-svh max-w-4xl">
        <header
          class="fixed top-0 left-0 w-full shadow-[0_0_15px_15px_rgba(255,255,255,1)]"
        ></header>

        ${params.active_config.disclaimer === null
          ? null
          : html` <input
                type="hidden"
                id="disclaimer"
                value="${params.active_config.disclaimer}"
              />`}

        <main class="flex flex-col px-6 pb-40">
          <img
            class="mt-6 mb-3"
            src="../assets/${params.active_config.id}/system.svg"
            height="33"
            width="33"
            alt="IA"
          />
          <div class="prose" data-role="system">
            ${params.active_config.greeting.map((g: string) => html`<p>${g}</p>`)}
          </div>

          ${params.displayable_configs.length !== 1
            ? html`
                <div>
                  <p class="mt-4 mb-2 text-xs font-medium tracking-wide text-gray-500">
                    VOUS ÊTES...
                  </p>
                  ${params.displayable_configs.map(
                    (c) => html`<a
                        data-config
                        href="/?config=${c.id}"
                        ${c.is_active === true ? 'data-active' : ''}
                        class="mr-2 mb-2 inline-block w-fit cursor-pointer rounded border border-gray-300 px-3 py-2 text-left font-serif text-sm/snug text-gray-700 hover:bg-gray-50 disabled:cursor-progress disabled:text-gray-500 disabled:hover:bg-white data-[active]:border-gray-400 data-[active]:bg-gray-100"
                      >
                        ${c.display}
                      </a>`
                  )}
                </div>
              `
            : null}

          <div>
            <p class="mt-4 mb-2 text-xs font-medium tracking-wide text-gray-500">EXEMPLES</p>
            ${params.active_config.examples.map(
              (eg: string) => html`<button
                  data-role="example"
                  class="mb-2 block w-fit cursor-pointer rounded border border-gray-300 px-3 py-2 text-left font-serif text-sm/snug text-gray-700 hover:bg-gray-50 disabled:cursor-progress disabled:text-gray-500 disabled:hover:bg-white"
                >
                  ${eg}
                </button>`
            )}
          </div>
        </main>

        <footer
          class="fixed bottom-0 w-full max-w-4xl bg-white shadow-[0_0_40px_40px_rgba(255,255,255,1)]"
        >
          <div
            class="mx-6 mb-6 flex h-fit flex-none items-center justify-between gap-x-2 rounded-lg border border-gray-200 bg-white py-3 pr-2 pl-4 shadow-sm"
          >
            <textarea
              class="row-span-2 min-h-[44px] flex-1 resize-none border-none font-serif text-base/snug outline-0 placeholder:font-sans placeholder:text-gray-400"
              id="prompt__input"
              type="text"
              name="message"
              placeholder="Comment puis-je vous aider ?"
            ></textarea>
            <button
              class="group h-8 cursor-pointer px-3 text-xl font-black hover:rounded-lg hover:bg-gray-100 disabled:cursor-progress disabled:border-stone-200 disabled:text-gray-400 disabled:hover:bg-white"
              type="button"
              id="prompt__submit"
            >
              <svg
                class="pointer-events-none fill-gray-600 group-disabled:fill-gray-200"
                viewBox="0 0 16 16"
                focusable="false"
                aria-hidden="true"
                height="22"
                width="22"
              >
                <path
                  class="pointer-events-none"
                  d="M.989 8 .064 2.68a1.342 1.342 0 0 1 1.85-1.462l13.402 5.744a1.13 1.13 0 0 1 0 2.076L1.913 14.782a1.343 1.343 0 0 1-1.85-1.463L.99 8Zm.603-5.288L2.38 7.25h4.87a.75.75 0 0 1 0 1.5H2.38l-.788 4.538L13.929 8Z"
                ></path>
              </svg>
            </button>
          </div>
        </footer>
      </body>
    </html>`
}
