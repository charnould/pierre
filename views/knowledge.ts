import { html } from 'hono/html'
import type { Metadata } from '../controllers/GET.knowledge'

export const view = (metadata: Metadata[]) => {
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
        <link rel="stylesheet" href="../assets/default/dist/css/style.1745562419398.css" />
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
          <h1 class="font-mono text-6xl font-extrabold">Encyclopédie</h1>

          <form
            class="flex flex-row"
            action="/a/knowledge?action=upload"
            method="post"
            enctype="multipart/form-data"
          >
            <label
              for="files"
              class="flex cursor-pointer items-center gap-3 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-4 py-2"
            >
              <p>
                <span class="block text-center text-base font-medium text-white"
                  >Uploader des fichiers</span
                >
                <span class="block text-center font-mono text-[11px] text-white"
                  >Uniquement .xlsx/docx/md</span
                >
              </p>

              <input
                type="file"
                id="files"
                name="files"
                accept=".docx, .xlsx, .md"
                hidden
                multiple
                required
              />
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
          Uniquement les fichiers Word (<span class="rounded bg-neutral-200 px-1 font-mono"
            >.docx</span
          >), Excel (<span class="rounded bg-neutral-200 px-1 font-mono">.xlsx</span>) et Markdown
          (<span class="rounded bg-neutral-200 px-1 font-mono">.md</span>) sont acceptés.
        </p>
        <p class="mb-2 max-w-2xl text-sm">
          La présence d'un fichier
          <span class="rounded bg-neutral-200 px-1 font-mono">_metadata.xlsx</span> est
          indispensable et obligatoire. Seuls les fichiers référencés dans celui-ci et disponibles
          ici sont pris en compte.
          <a
            href="../assets/default/files/_metadata.xlsx"
            class="cursor-pointer text-blue-600 underline decoration-1 underline-offset-3"
            >Télécharger un gabarit vide</a
          >, le compléter, puis l'uploader.
        </p>
        <form method="post" enctype="multipart/form-data" class="mb-2 max-w-2xl text-sm">
          La reconstruction de l'encyclopédie se réalise automatiquement à 4h du matin et dure
          environ 10 minutes (variable selon le volume de données). Vous pouvez
          <button
            formaction="/a/knowledge?action=rebuild"
            class="inline w-fit cursor-pointer whitespace-normal text-blue-600 underline decoration-1 underline-offset-3"
          >
            forcer une reconstruction immédiate</button
          >, mais attention : PIERRE ne saura plus rien le temps de la reconstruction.
        </form>

        <p class="mb-9 max-w-2xl text-sm">
          <span class="font-mono font-extrabold">Important/</span> S'il manque des connaissances
          génériques à PIERRE, qu'elles soient nationales (les impacts du SLS) ou locales
          (l'assurance-habitation de la ville de Paris) : ne pas les uploader et envoyer un email à
          <a
            href="mailto:charnould@pierre-ia.org"
            class="cursor-pointer text-blue-600 underline decoration-1 underline-offset-3"
            >charnould@pierre-ia.org</a
          >
          .
        </p>

        <div class="mb-10">
          ${metadata.map(
            (m) =>
              html` <div class="mb-1 flex flex-row items-center">
                <form class="mr-8 flex flex-row gap-x-3" method="post">
                  <button
                    data-turbo="false"
                    name="filename"
                    formaction="/a/knowledge?action=download"
                    value="${m.filename}"
                  >
                    <svg
                      class="size-6 cursor-pointer stroke-2 hover:stroke-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                  </button>

                  <button
                    name="filename"
                    formaction="/a/knowledge?action=destroy"
                    value="${m.filename}"
                  >
                    <svg
                      class="size-6 cursor-pointer stroke-2 hover:stroke-red-700"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                      />
                    </svg>
                  </button>
                </form>

                <p class="mr-8 font-mono text-[15px] text-neutral-500">
                  ${m.last_modification_time}
                </p>
                <p class="mr-8 w-20 text-right font-mono text-[15px] text-neutral-500">
                  ${Math.round(m.size / 1000)} ko
                </p>

                <p class="w-md truncate pr-10 font-medium">${m.filename}</p>
              </div>`
          )}
        </div>
      </body>
    </html>`
}
