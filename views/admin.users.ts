import { html } from 'hono/html'
import type { Parsed_User } from '../utils/_schema'

export const view = (users: Parsed_User[]) => {
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
        <link rel="stylesheet" href="../assets/default/dist/css/style.1759266844313.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk&display=swap"
          rel="stylesheet"
        />
        <title>PIERRE — Console</title>
      </head>

      <body class="mt-20 ml-20 w-4xl min-w-4xl bg-stone-50">
        <a href="/a" class="mb-6 block w-fit rounded-full bg-teal-200 px-3 py-1 pr-4 font-medium"
          >← Retour</a
        >

        <div class="mb-10 flex flex-row items-center justify-between">
          <h1 class="font-mono text-6xl font-extrabold">Utilisateurs</h1>

          <form class="flex flex-row" action="/a/users" method="post" enctype="multipart/form-data">
            <label
              for="files"
              class="flex cursor-pointer items-center gap-3 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-4 py-2"
            >
              <p>
                <span class="block text-center text-base font-medium text-white"
                  >Uploader les utilisateurs</span
                >
                <span class="block text-center font-mono text-[11px] text-white"
                  >Uniquement .xlsx</span
                >
              </p>

              <input type="file" id="files" name="files" accept=".xlsx" hidden required />
            </label>

            <button
              type="submit"
              class="mx-1 cursor-pointer appearance-none rounded-lg bg-linear-to-r from-blue-700 to-blue-800 p-2 px-4 font-bold text-white outline-none"
            >
              <svg
                class="size-6 stroke-white stroke-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                />
              </svg>
            </button>
          </form>
        </div>

        <p class="mb-2 max-w-2xl text-sm">
          Les utilisateurs de PIERRE, ainsi que leurs habilitations, sont gérés via un fichier
          <span class="rounded bg-neutral-200 px-1 font-mono">xlsx</span> dont vous pouvez choisir
          le nom librement.
          <a
            href="../assets/default/files/_users.xlsx"
            class="cursor-pointer text-blue-600 underline decoration-1 underline-offset-3"
            >Téléchargez le gabarit</a
          >, complétez-le, puis importez-le. Pour des raisons de sécurité, vous serez
          automatiquement déconnecté après l’importation. Conservez ce fichier dans un emplacement
          sûr ; en effet, les mots de passe qu’il contient sont stockés en clair.
        </p>

        <p class="mb-8 max-w-2xl text-sm">
          Pour ajouter, modifier ou supprimer un ou des utilisateurs, il vous suffit de mettre à
          jour ce fichier, puis de l'importer à nouveau. Pour rechercher un utilisateur, utilisez
          <span class="rounded bg-neutral-200 px-1 font-mono">CTRL</span> +
          <span class="rounded bg-neutral-200 px-1 font-mono">F</span>.
        </p>

        <ul class="mb-20">
          ${users.map(
            (user) => html`<li class="flex items-center text-base">
                <span>${user.email}</span>
                <span class="ml-2 rounded-lg bg-blue-200 px-2 text-xs font-light"
                  >${user.role}</span
                >
                ${user.config.map(
                  (c) => html`<span class="ml-1 rounded-lg bg-gray-200 px-2 text-xs font-light"
                      >${c}</span
                    >`
                )}
              </li> `
          )}
        </ul>
      </body>
    </html>`
}
