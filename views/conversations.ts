import { html, raw } from 'hono/html'
import { marked } from 'marked'
import type { Reply } from '../utils/_schema'

export const view = (data, conversation: Reply[] | []) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/@hotwired/turbo@8.0.12/dist/turbo.es2017-umd.js"></script>
        <link rel="icon" href="../assets/pierre-ia.org/system.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="../assets/pierre-ia.org/dist/css/style.1733259390640.css" />
        <title>PIERRE — Administration > Conversations</title>
      </head>

      <body class="mx-20 my-10 flex gap-x-20">
        <div class="sticky top-20 left-20 h-screen w-[400px]">
          <a href="/a" class="font-medium text-blue-700">← Retour</a>
          <h1 class="mt-5 mb-5 text-6xl font-bold">Conversations</h1>

          <!-- START: conversations list -->
          <div class="h-[550px] overflow-y-auto rounded-lg border-3 bg-white">
            ${data.map(
              (conv) =>
                html` <a href="/a/conversations?id=${conv[0].conv_id}">
                  <div class="mx-6 mt-3 flex items-center text-[13px] text-neutral-400">
                    ${conv[0].metadata.evaluation.organization.score === 0
                      ? html`<span class="h-3 w-6 rounded-full bg-red-500">&nbsp;</span>`
                      : conv[0].metadata.evaluation.organization.score === 1
                        ? html`<span class="h-3 w-6 rounded-full bg-orange-400">&nbsp;</span>`
                        : conv[0].metadata.evaluation.organization.score === 2
                          ? html`<span class="h-3 w-6 rounded-full bg-lime-300">&nbsp;</span>`
                          : conv[0].metadata.evaluation.organization.score === 3
                            ? html`<span class="h-3 w-6 rounded-full bg-green-500">&nbsp;</span>`
                            : html`<span class="h-3 w-6 rounded-full bg-neutral-400">&nbsp;</span>`}
                    <span>&nbsp;• ${conv[0].timestamp.substring(0, 16)} • ${conv[0].config}</span>
                  </div>
                  <div class="border-b-1 border-neutral-200 px-6 pb-2 text-sm">
                    ${conv[0].content}
                  </div>
                </a>`
            )}
          </div>
          <!-- END: conversations list -->
        </div>

        <!-- START: Displayed conversation -->
        <div class="w-[700px]">
          ${conversation.length === 0
            ? null
            : html`
                ${conversation.map(
                  (c) =>
                    html`<div
                      class="prose odd:float-right odd:my-8 odd:max-w-lg odd:rounded-xl odd:bg-stone-100 odd:px-5 odd:py-2 odd:font-['Work_Sans'] odd:text-base even:clear-both"
                    >
                      ${raw(marked.parse(c.content))}
                    </div>`
                )}
                <!-- START: Score conversation -->
                <form method="post" class="mt-12 flex flex-col">
                  <div
                    class="flex flex-row items-center gap-x-4 rounded-lg p-2 pr-3 pl-3 shadow-[0_0_14px_14px_rgba(0,0,0,0.05)]"
                  >
                    <input
                      name="comment"
                      type="text"
                      placeholder="Votre commentaire sur la conversation"
                      value="${conversation[0]?.metadata.evaluation.organization.comment}"
                      class="flex-1 border-0 p-2 outline-none"
                    />
                    <fieldset>
                      <input
                        id="s0"
                        type="radio"
                        class="peer/s0 hidden"
                        name="score"
                        value="0"
                        ${conversation[0]?.metadata.evaluation.organization.score === 0
                          ? 'checked'
                          : ''}
                      />
                      <label
                        for="s0"
                        class="cursor-pointer rounded-full bg-red-500 px-[2px] text-2xl peer-checked/s0:rounded-full peer-checked/s0:ring-3"
                        >&nbsp;&nbsp;&nbsp;&nbsp;</label
                      >

                      <input
                        id="s1"
                        type="radio"
                        class="peer/s1 hidden"
                        name="score"
                        value="1"
                        ${conversation[0]?.metadata.evaluation.organization.score === 1
                          ? 'checked'
                          : ''}
                      />
                      <label
                        for="s1"
                        class="cursor-pointer rounded-full bg-orange-400 px-[2px] text-2xl peer-checked/s1:rounded-full peer-checked/s1:ring-3"
                        >&nbsp;&nbsp;&nbsp;&nbsp;</label
                      >

                      <input
                        id="s2"
                        type="radio"
                        class="peer/s2 hidden"
                        name="score"
                        value="2"
                        ${conversation[0]?.metadata.evaluation.organization.score === 2
                          ? 'checked'
                          : ''}
                      />
                      <label
                        for="s2"
                        class="cursor-pointer rounded-full bg-lime-300 px-[2px] text-2xl peer-checked/s2:rounded-full peer-checked/s2:ring-3"
                        >&nbsp;&nbsp;&nbsp;&nbsp;</label
                      >

                      <input
                        id="s3"
                        type="radio"
                        class="peer/s3 hidden"
                        name="score"
                        value="3"
                        ${conversation[0]?.metadata.evaluation.organization.score === 3
                          ? 'checked'
                          : ''}
                      />
                      <label
                        for="s3"
                        class="cursor-pointer rounded-full bg-green-500 px-[2px] text-2xl peer-checked/s3:rounded-full peer-checked/s3:ring-3"
                        >&nbsp;&nbsp;&nbsp;&nbsp;</label
                      >
                    </fieldset>

                    <input name="scorer" type="hidden" value="organization" />

                    <input
                      type="submit"
                      value="→"
                      class="h-8 w-8 cursor-pointer rounded-full bg-slate-900 text-center text-white"
                    />
                  </div>

                  <button
                    name="deletion"
                    value="true"
                    class="mt-2 mb-10 cursor-pointer text-xs text-blue-700 underline underline-offset-3"
                  >
                    Supprimer définitivement cette conversation
                  </button>
                </form>
                <!-- END: Score conversation -->
              `}
        </div>
        <!-- END: Displayed conversation -->
      </body>
    </html>`
}
