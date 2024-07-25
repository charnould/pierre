import { html, raw } from 'hono/html'
import { marked } from 'marked'
import type { Reply } from '../utils/_schema'

export const view = (is_auth, data, conversation: Reply[]) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/@hotwired/turbo@8.0.4/dist/turbo.es2017-umd.js"></script>
        <link rel="stylesheet" href="../assets/_default/dist/review.css" />
        <title>PIERRE</title>
      </head>

      ${
        is_auth === true
          ? html`<body class="flex h-dvh flex-col justify-between">
            <div class="flex h-dvh">
              <div
                class="no-scrollbar flex flex-col gap-x-6 overflow-y-scroll border-r-1 border-slate-300 p-5"
              >
                <form action="/login" method="post">
                  <input type="hidden" name="action" value="logout" />
                  <input
                    type="submit"
                    value="Se déconnecter"
                    class="cursor-pointer text-sm text-blue-700 underline decoration-2 underline-offset-2"
                  />
                  <!--
                  <a href="" class="text-blue-700 underline decoration-2 underline-offset-2">toutes</a>,
                  <a href="" class="text-blue-700 underline decoration-2 underline-offset-2">non revues</a>.
                  -->
                </form>

                ${data.map(
                  (conv) =>
                    html` <a href="/review?id=${conv[0].id}">
                      <table
                        class="my-2 w-[450px] border-separate border-spacing-0 rounded border-1 border-current border-slate-200"
                      >
                        <tr>
                          <td colspan="4" class="p-2">${conv[0].content}</td>
                        </tr>
                        <tr>
                          <td
                            class="border-t-1 border-slate-200 pt-1 px-1 pb-0 text-[10px] text-slate-500"
                          >
                            USER
                          </td>
                          <td
                            class="border-t-1 border-slate-200 pt-1 px-1 pb-0 text-[10px] text-slate-500"
                          >
                            REVIEWER
                          </td>
                          <td
                            class="border-t-1 border-slate-200 pt-1 px-1 pb-0 text-[10px] text-slate-500"
                          >
                            CONFIG
                          </td>
                          <td
                            class="border-t-1 border-slate-200 pt-1 px-1 pb-0 text-[10px] text-slate-500"
                          >
                            DATE
                          </td>
                        </tr>
                        <tr>
                          <td class="px-1 pb-1 text-[11px]">―</td>
                          <td class="px-1 pb-1 text-[11px]">
                            ${
                              conv[0].reviewer_score === 0
                                ? '0/3 😡'
                                : conv[0].reviewer_score === 1
                                  ? '1/3 😕'
                                  : conv[0].reviewer_score === 2
                                    ? '2/3 🙂'
                                    : conv[0].reviewer_score === 3
                                      ? '3/3 😃'
                                      : '―'
                            }
                          </td>
                          <td class="px-1 pb-1 text-[11px]">
                            ${conv[0].config}
                          </td>
                          <td class="px-1 pb-1 text-[11px]">
                            ${conv[0].timestamp.substring(0, 16)}
                          </td>
                        </tr>
                      </table></a
                    >`
                )}
              </div>

              <div class="flex flex-1 flex-col justify-between">
                <div
                  id="conversation"
                  class="no-scrollbar overflow-y-scroll p-4"
                >
                  ${conversation.map(
                    (c) =>
                      html`<div
                        class="text-sm odd:float-right odd:my-6 odd:w-fit odd:rounded-lg odd:bg-gray-200 odd:p-3 even:clear-both"
                      >
                        ${raw(marked.parse(c.content))}
                      </div>`
                  )}
                </div>
                <form
                  action=""
                  method="post"
                  class="flex flex-row items-center gap-x-4 border-t-1 border-slate-300 bg-slate-100 p-2"
                >
                  <input
                    name="comment"
                    type="text"
                    placeholder="Notez (et/ou commentez) l'interaction client/IA"
                    value="${conversation[0]?.reviewer_comment}"
                    class="flex-1 border-0 p-2 outline-none"
                  />
                  <fieldset>
                    <input
                      required
                      id="s0"
                      type="radio"
                      class="peer/s0 hidden"
                      name="score"
                      value="0"
                      ${conversation[0]?.reviewer_score === 0 ? 'checked' : ''}
                    />
                    <label
                      for="s0"
                      class="cursor-pointer px-[2px] text-2xl peer-checked/s0:rounded-full peer-checked/s0:ring-3"
                      >😡</label
                    >

                    <input
                      id="s1"
                      type="radio"
                      class="peer/s1 hidden"
                      name="score"
                      value="1"
                      ${conversation[0]?.reviewer_score === 1 ? 'checked' : ''}
                    />
                    <label
                      for="s1"
                      class="cursor-pointer px-[2px] text-2xl peer-checked/s1:rounded-full peer-checked/s1:ring-3"
                      >😕</label
                    >

                    <input
                      id="s2"
                      type="radio"
                      class="peer/s2 hidden"
                      name="score"
                      value="2"
                      ${conversation[0]?.reviewer_score === 2 ? 'checked' : ''}
                    />
                    <label
                      for="s2"
                      class="cursor-pointer px-[2px] text-2xl peer-checked/s2:rounded-full peer-checked/s2:ring-3"
                      >🙂</label
                    >

                    <input
                      id="s3"
                      type="radio"
                      class="peer/s3 hidden"
                      name="score"
                      value="3"
                      ${conversation[0]?.reviewer_score === 3 ? 'checked' : ''}
                    />
                    <label
                      for="s3"
                      class="cursor-pointer px-[2px] text-2xl peer-checked/s3:rounded-full peer-checked/s3:ring-3"
                      >😃</label
                    >
                  </fieldset>

                  <input name="scorer" type="hidden" value="reviewer" />

                  <input
                    type="submit"
                    value="→"
                    class="h-8 w-8 cursor-pointer rounded-full bg-slate-900 text-center text-white"
                  />
                </form>
              </div>
            </div>
          </body>`
          : html`
            <body>
              <form
                action="/login"
                method="post"
                class="flex h-dvh items-center justify-center gap-x-2"
              >
                <input type="hidden" name="action" value="login" />
                <input
                  name="password"
                  type="password"
                  autocomplete="PIERRE password"
                  placeholder="Password"
                  class="rounded border-slate-400 p-3 text-3xl outline-none placeholder:text-slate-400"
                />

                <input
                  type="submit"
                  value="➔"
                  class="cursor-pointer rounded bg-blue-600 py-3 px-4 text-3xl text-white"
                />
              </form>
            </body>
          `
      }
    </html>`
}
