import { html, raw } from 'hono/html'

import type { Displayable_configs } from '../controllers/chat/get'
import type { Config } from '../utils/_schema'
import { buildChatBoot } from '../utils/chat-boot'

export const view = (params: {
  active_config: Config
  displayable_configs: Displayable_configs
  dataParam?: string
}) => {
  const bootData = JSON.stringify(
    buildChatBoot(params.active_config, params.displayable_configs, params.dataParam)
  ).replace(/</g, '\\u003c')

  return html`<!doctype html>
    <html lang="fr" class="scroll-smooth antialiased">
      <head>
        <meta charset="UTF-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <link rel="stylesheet" href="../assets/dist/css/style.1788813906141.css" />
        <link rel="icon" href="/branding/system.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/branding/icons/ios/180.png" />
        <link rel="manifest" href="/branding/manifest.webmanifest" />
        <script type="module" src="../assets/dist/js/ai.1788813906141.js"></script>
        <title>Comment puis-je vous aider ? 🖐️</title>
      </head>

      <body class="bg-background">
        <script type="application/json" id="pierre-data">
          ${raw(bootData)}
        </script>
        <div id="root"></div>
      </body>
    </html>`
}
