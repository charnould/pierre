import * as Plot from '@observablehq/plot'
import { html, raw } from 'hono/html'
import { JSDOM } from 'jsdom'
import type { StatisticOptions } from '../controllers/GET.performance'

/**
 * Generates a graphic plot based on the provided data and options.
 *
 * @param data - The data to be plotted, in JSON string format.
 * @param options - An object containing various options for the statistic plot.
 * @returns The outer HTML of the generated plot as a string.
 *
 * @typedef {Object} StatisticOptions
 * @property {string} window - The window option for the plot.
 * @property {string} color - The color option for the plot.
 * @property {string} facet - The facet option for the plot.
 */
const generate_graphic = (data, options: StatisticOptions) => {
  const plot = Plot.waffleY(
    JSON.parse(data),
    Plot.groupX(
      { y: 'count' },
      {
        x: `${options.window}`,
        fill: `${options.color}`,
        sort: `${options.color}`,
        fy: `${options.facet}`
      }
    )
  ).plot({
    document: new JSDOM('').window.document,
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
      type: 'ordinal',
      scheme: 'rainbow',
      legend: true
    }
  })

  plot.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/2000/svg')
  plot.setAttributeNS(
    'http://www.w3.org/2000/xmlns/',
    'xmlns:xlink',
    'http://www.w3.org/1999/xlink'
  )

  return plot.outerHTML
}

export const view = (data, options: StatisticOptions) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/@hotwired/turbo@8.0.12/dist/turbo.es2017-umd.js"></script>
        <link rel="icon" href="../assets/pierre-ia.org/system.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="../assets/pierre-ia.org/dist/css/style.1739741252036.css" />
        <title>PIERRE — Console</title>
      </head>

      <body class="mt-20 ml-20 w-5xl min-w-5xl bg-stone-50">
        <a href="/a" class="mb-6 block w-fit rounded-full bg-teal-200 px-3 py-1 pr-4 font-medium"
          >← Retour</a
        >

        <form
          class="mb-10 flex flex-row items-center justify-between"
          action="/a/performance"
          method="get"
        >
          <h1 class="font-mono text-6xl font-extrabold">Performance</h1>
          <button
            data-turbo="false"
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
            <option value="config" ${options.color === 'config' ? 'selected' : null}>
              configuration
            </option>
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
            <option value="config" ${options.facet === 'config' ? 'selected' : null}>
              segmentées par configuration
            </option>
            <option disabled value="topics">segmentées par thématique</option>
          </select>

          <input
            type="submit"
            class="mx-1 cursor-pointer appearance-none rounded p-2 px-4 font-bold shadow-[0px_0px_3px_rgba(0,0,0,0.4)] outline-none"
            value="→"
          />
        </form>

        <div class="m-auto">${raw(generate_graphic(data, options))}</div>
      </body>
    </html>`
}
