import { html, raw } from 'hono/html'
import { marked } from 'marked'
import type { Reply } from '../utils/_schema'

export const view = (data, conversation: Reply[] | []) => {
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
        <link rel="stylesheet" href="../assets/default/dist/css/style.1747313401108.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inclusive+Sans:wght@350&display=swap"
          rel="stylesheet"
        />
        <meta name="turbo-refresh-method" content="morph" />
        <meta name="turbo-refresh-scroll" content="preserve" />
        <title>PIERRE — Console</title>
      </head>

      <body class="mt-20 ml-10 flex gap-x-20 bg-stone-50">
        <div class="sticky top-20 left-20 h-screen w-[400px]">
          <a href="/a" class="mb-6 block w-fit rounded-full bg-teal-200 px-3 py-1 pr-4 font-medium"
            >← Retour</a
          >
          <h1 class="font-mono text-4xl font-extrabold">Conversations</h1>

          <!-- START: conversations list -->
          <div class="mt-6 h-[550px] overflow-y-auto rounded-lg border border-stone-200 shadow-lg">
            ${data.map(
              (conv) =>
                html` <a href="/a/conversations?id=${conv[0].conv_id}">
                  ${conv[0].metadata.topics === 'TODO'
                    ? html`<div
                        class="mx-6 mt-3 mb-px flex w-fit items-center rounded-sm bg-amber-200 px-1 py-px text-[9px] font-medium text-red-500"
                      >
                        L'IA NE SAIT PAS
                      </div>`
                    : null}

                  <div class="mx-6 mt-3 flex w-auto items-center text-[12px] text-neutral-400">
                    <span
                      data-score="${conv[0].metadata.evaluation.ai.score}"
                      class="mr-px h-3 w-2 shrink-0 rounded-xs bg-neutral-400 data-[score='-1']:bg-red-500 data-[score='0']:bg-red-500 data-[score='1']:bg-orange-400 data-[score='2']:bg-lime-300 data-[score='3']:bg-green-500"
                      >&nbsp;</span
                    >
                    <span
                      data-score="${conv[0].metadata.evaluation.organization.score}"
                      class="mr-px h-3 w-2 shrink-0 rounded-xs bg-neutral-400 data-[score='0']:bg-red-500 data-[score='1']:bg-orange-400 data-[score='2']:bg-lime-300 data-[score='3']:bg-green-500"
                      >&nbsp;</span
                    >

                    <span class="w-full truncate"
                      >&nbsp;•
                      ${new Intl.DateTimeFormat('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        hourCycle: 'h23'
                      })
                        .format(new Date(conv[0].timestamp))
                        .replace(' ', '∙')}
                      • ${conv[0].config} •
                      ${conv[0].metadata.user !== null
                        ? conv[0].metadata.user
                        : 'Utilisateur inconnu'}
                    </span>
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
                      class="prose odd:float-right odd:my-8 odd:max-w-lg odd:rounded-xl odd:bg-gray-100 odd:px-5 odd:py-2 odd:font-serif odd:text-base even:clear-both"
                    >
                      ${raw(marked.parse(c.content))}
                    </div>`
                )}
                <!-- START: Score conversation -->
                <form method="post" class="clear-both mt-12 flex flex-col">
                  <div
                    class="flex flex-row items-center gap-x-4 rounded-lg border border-stone-100 p-2 pr-3 pl-3 shadow-lg"
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
