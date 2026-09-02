import { html, raw } from 'hono/html'

import type { Displayable_configs } from '../controllers/chat/get'
import type { Config } from '../utils/_schema'
import { buildChatBootData } from '../utils/chat-boot'

export const view = (params: {
  active_config: Config
  displayable_configs: Displayable_configs
}) => {
  // Boot data serialized as JSON, with `<` escaped to prevent `</script>` from closing the tag
  const bootData = JSON.stringify(
    buildChatBootData(params.active_config, params.displayable_configs)
  ).replace(/</g, '\\u003c')

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
        <link rel="stylesheet" href="../assets/dist/css/style.1788381380835.css" />
        <link
          rel="icon"
          href="../customization/chatbots/${params.active_config.id}/system.svg"
          type="image/svg+xml"
        />
        <link
          rel="manifest"
          href="../customization/chatbots/${params.active_config.id}/manifest.json"
        />
        <script type="module" src="../assets/dist/js/ai.1788381380835.js"></script>
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
