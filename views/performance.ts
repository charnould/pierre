import { html, raw } from 'hono/html'
import type { StatisticOptions } from '../controllers/GET.performance'

export const view = (data, options: StatisticOptions) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="../assets/pierre-ia.org/system.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="../assets/pierre-ia.org/dist/css/style.1738923107833.css" />
        <title>PIERRE — Administration > Performance</title>
      </head>

      <script type="module">
        import * as Plot from 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm'
        const data = ${raw(data)}

        const plot = Plot.waffleY(
          data,
          Plot.groupX(
            { y: 'count' },
            {
              x: '${raw(options.window)}',
              fill: '${raw(options.color)}',
              sort: '${raw(options.color)}',
              fy: '${raw(options.facet)}'
            }
          )
        ).plot({
          marks: [
            Plot.ruleY([0]),
            Plot.axisY({ anchor: 'left', label: 'Nombre de conversations', labelAnchor: 'top' }),
            Plot.axisX({ tickRotate: -35 })
          ],
          width: 1024,
          marginBottom: 100,
          x: {
            label: null,
            type: 'band'
          },
          color: {
            legend: true,
            domain: ['0', '1', '2', '3', 'Non noté'],
            range: ['#fb2c36', '#ffb900', '#9ae600', '#00c951', '#44403b']
          }
        })

        const div = document.querySelector('#myplot')
        div.append(plot)
      </script>
      <body class="m-auto mt-10 mb-0 w-6xl min-w-6xl bg-stone-50">
        <a href="/a" class="mb-4 block w-fit rounded-full bg-teal-200 px-3 py-1 pr-4 font-semibold"
          >← Retour</a
        >

        <div
          class="h-full rounded-lg border-1 border-stone-300 bg-white px-14 py-10 shadow-[0px_0px_20px_rgba(200,200,200,0.5)]"
        >
          <form
            class="mb-10 flex flex-row items-center justify-between"
            action="/a/performance"
            method="get"
          >
            <h1 class="text-6xl font-bold">Performance</h1>
            <button
              type="submit"
              name="action"
              value="download"
              class="cursor-pointer rounded-full bg-zinc-200 px-4 py-2 text-center text-sm font-medium text-stone-900"
            >
              Télécharger les conversations
            </button>
          </form>

          <form class="font-base mb-10 text-sm" action="/a/performance" method="get">
            <input type="hidden" name="action" value="visualize" />
            Visualiser les conversations des
            <select
              name="window"
              class="mx-1 cursor-pointer appearance-none rounded p-2 font-bold shadow-[0px_0px_3px_rgba(0,0,0,0.4)] outline-none"
            >
              <option value="last_1h" ${options.window === 'last_1h' ? 'selected' : null}>
                60 dernières minutes
              </option>
              <option value="last_24h" ${options.window === 'last_24h' ? 'selected' : null}>
                24 dernières heures
              </option>
              <option value="last_30d" ${options.window === 'last_30d' ? 'selected' : null}>
                30 derniers jours
              </option>
              <option value="last_365d" ${options.window === 'last_365d' ? 'selected' : null}>
                12 derniers mois
              </option>
            </select>
            colorisées par
            <select
              name="color"
              class="mx-1 cursor-pointer appearance-none rounded p-2 font-bold shadow-[0px_0px_3px_rgba(0,0,0,0.4)] outline-none"
            >
              <option value="user_score" ${options.color === 'user_score' ? 'selected' : null}>
                score-utilisateur
              </option>
              <option value="org_score" ${options.color === 'org_score' ? 'selected' : null}>
                score-organisme
              </option>
              <option disabled value="profil">profil</option>
              <option disabled value="topics">thématique</option>
            </select>
            et

            <select
              name="facet"
              class="mx-1 cursor-pointer appearance-none rounded p-2 font-bold shadow-[0px_0px_3px_rgba(0,0,0,0.4)] outline-none"
            >
              <option value="null" ${options.facet === null ? 'selected' : null}>
                sans segmentation
              </option>

              <option value="user_score" ${options.facet === 'user_score' ? 'selected' : null}>
                segmentées par score-utilisateur
              </option>
              <option value="org_score" ${options.facet === 'org_score' ? 'selected' : null}>
                segmentées par score-organisme
              </option>
              <option disabled value="profil">segmentées par profil</option>
              <option disabled value="topics">segmentées par thématique</option>
            </select>

            <input
              type="submit"
              class="mx-1 cursor-pointer appearance-none rounded p-2 px-4 font-bold shadow-[0px_0px_3px_rgba(0,0,0,0.4)] outline-none"
              value="→"
            />
          </form>

          <div id="myplot" class="m-auto"></div>
        </div>
      </body>
    </html>`
}
