import { html, raw } from "hono/html";
import { marked } from "marked";
import type { Reply } from "../utils/_schema";

export const view = (is_auth, data, conversation: Reply[]) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/@hotwired/turbo@8.0.4/dist/turbo.es2017-umd.js"></script>
        <link rel="stylesheet" href="../assets/_default/dist/admin.css" />
        <title>PIERRE</title>
      </head>

      ${is_auth === true
        ? html`<body class="flex h-dvh flex-col justify-between bg-[#FFFCF9]">
            <form action="/admin/login" method="post" class="flex justify-center gap-x-5 p-4 font-bold text-slate-700">
              <input type="hidden" name="action" value="logout" />
              <div class="flex gap-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                  />
                </svg>
                <a href="">Conversations</a>
              </div>

              <div class="flex gap-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
                  />
                </svg>

                <a href="" class="line-through">Statistiques</a>
              </div>

              <div class="flex gap-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M14.25 9.75 16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
                  />
                </svg>

                <a href="" class="line-through">Logs</a>
              </div>

              <div class="flex gap-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                  class="size-6"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
                  />
                </svg>

                <input type="submit" value="Logout" class="cursor-pointer font-medium" />
              </div>
            </form>

            <div class="mx-auto mb-4 flex h-[90%] w-[1100px] rounded-lg border-1 border-slate-200 bg-white shadow-lg">
              <div class="no-scrollbar flex flex-col gap-x-6 overflow-y-scroll border-r-1 border-slate-200 p-6">
                ${data.map(
                  (conv) =>
                    html` <a href="/admin/chats?id=${conv[0].id}">
                      <table
                        class="my-2 w-[450px] border-separate border-spacing-0 rounded border-1 border-current border-slate-200"
                      >
                        <tr>
                          <td colspan="4" class="p-2">${conv[0].content}</td>
                        </tr>
                        <tr>
                          <td class="border-t-1 border-slate-200 pt-1 px-1 pb-0 text-[10px] text-slate-500">USER</td>
                          <td class="border-t-1 border-slate-200 pt-1 px-1 pb-0 text-[10px] text-slate-500">
                            REVIEWER
                          </td>
                          <td class="border-t-1 border-slate-200 pt-1 px-1 pb-0 text-[10px] text-slate-500">CONFIG</td>
                          <td class="border-t-1 border-slate-200 pt-1 px-1 pb-0 text-[10px] text-slate-500">DATE</td>
                        </tr>
                        <tr>
                          <td class="px-1 pb-1 text-[11px]">―</td>
                          <td class="px-1 pb-1 text-[11px]">
                            ${conv[0].reviewer_score === 0
                              ? "0/3 😡"
                              : conv[0].reviewer_score === 1
                                ? "1/3 😕"
                                : conv[0].reviewer_score === 2
                                  ? "2/3 🙂"
                                  : conv[0].reviewer_score === 3
                                    ? "3/3 😃"
                                    : "―"}
                          </td>
                          <td class="px-1 pb-1 text-[11px]">${conv[0].config}</td>
                          <td class="px-1 pb-1 text-[11px]">${conv[0].timestamp.substring(0, 16)}</td>
                        </tr>
                      </table></a
                    >`,
                )}
              </div>

              <div class="flex flex-1 flex-col justify-between">
                <div id="conversation" class="no-scrollbar overflow-y-scroll p-6">
                  ${conversation.map(
                    (c) =>
                      html`<div
                        class="mb-6 text-sm odd:float-right odd:w-fit odd:rounded-lg odd:bg-gray-200 odd:p-3 even:clear-both"
                      >
                        ${raw(marked.parse(c.content))}
                      </div>`,
                  )}
                </div>
                <form
                  action=""
                  method="post"
                  class="flex flex-row items-center gap-x-4 border-t-1 border-slate-200 bg-slate-50 p-2"
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
                      ${conversation[0]?.reviewer_score === 0 ? "checked" : ""}
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
                      ${conversation[0]?.reviewer_score === 1 ? "checked" : ""}
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
                      ${conversation[0]?.reviewer_score === 2 ? "checked" : ""}
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
                      ${conversation[0]?.reviewer_score === 3 ? "checked" : ""}
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
                action="/admin/login"
                method="post"
                class="flex h-dvh items-center justify-center gap-x-2 bg-[#FFFCF9]"
              >
                <input type="hidden" name="action" value="login" />
                <input
                  autofocus
                  name="password"
                  type="password"
                  autocomplete="PIERRE password"
                  placeholder="Password"
                  class="rounded border-slate-300 bg-white p-3 text-3xl outline-none placeholder:text-slate-400"
                />

                <input
                  type="submit"
                  value="➔"
                  class="cursor-pointer rounded bg-blue-600 py-3 px-4 text-3xl text-white"
                />
              </form>
            </body>
          `}
    </html>`;
};
