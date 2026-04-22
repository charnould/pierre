import { randomUUIDv7 } from 'bun'
import { html, raw } from 'hono/html'

import type { Displayable_configs } from '../controllers/GET.index'
import type { Config } from '../utils/_schema'

export const view = (params: {
  active_config: Config
  displayable_configs: Displayable_configs
}) => {
  // Boot data serialized as JSON, with `<` escaped to prevent `</script>` from closing the tag
  const bootData = JSON.stringify({
    convId: randomUUIDv7(),
    configId: params.active_config.id,
    dataParam: '',
    disclaimer: params.active_config.disclaimer ?? null,
    greeting: params.active_config.greeting,
    examples: params.active_config.examples,
    displayableConfigs: params.displayable_configs.map((c) => ({
      id: c.id,
      display: c.display,
      is_active: c.is_active
    })),
    assetId: params.active_config.id
  }).replace(/</g, '\\u003c')

  return html`<!doctype html>
    <html lang="fr" class="scroll-smooth bg-white tracking-[-0.1px] antialiased">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <link rel="preconnect" href="https://rsms.me" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link rel="stylesheet" href="../assets/core/dist/css/style.1776847891989.css" />
        <link
          rel="icon"
          href="../assets/${params.active_config.id}/system.svg"
          type="image/svg+xml"
        />
        <link rel="manifest" href="../assets/${params.active_config.id}/manifest.json" />
        <script type="module" src="../assets/core/dist/js/ai.1776847891989.js"></script>
        <title>Comment puis-je vous aider ? 🖐️</title>
      </head>

      <body class="mx-auto h-svh max-w-4xl">
        <script type="application/json" id="pierre-data">
          ${raw(bootData)}
        </script>
        <div id="root"></div>
      </body>
    </html>`
}
