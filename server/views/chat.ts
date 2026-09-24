import { html, raw } from 'hono/html'

import type { ChatbotConfig } from '../utils/_schema'
import { buildChatBoot } from '../utils/chat-boot'
import { chatJs, widgetAssets } from './assets'
import { htmlPage } from './document'

export function chatPage(params: {
  active_config: ChatbotConfig
  dataParam?: string
  embed?: boolean
}) {
  const embed = params.embed === true
  const bootData = JSON.stringify(
    buildChatBoot(params.active_config, [], params.dataParam, embed)
  ).replace(/</g, '\\u003c')

  return htmlPage({
    title: 'Comment puis-je vous aider ?',
    bodyClass: embed ? '' : 'bg-background',
    head: html`${
        embed
          ? html`<link rel="stylesheet" href="${widgetAssets.frameCss}" />
              <link rel="stylesheet" href="${widgetAssets.modalCss}" />`
          : html``
      }
      <link rel="icon" href="/branding/icons/icon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/branding/icons/apple-touch-icon.png" />
      <link rel="manifest" href="/branding/manifest.webmanifest" />
      <script type="module" src="${chatJs}"></script>
      ${embed ? html`<script src="${widgetAssets.embedJs}"></script>` : html``}`,
    body: html`<script type="application/json" id="pierre-data">
        ${raw(bootData)}
      </script>
      ${
        embed
          ? html`<div
              id="pierre-embed-modal"
              hidden
              role="dialog"
              aria-modal="true"
              aria-label="Assistant PIERRE"
              aria-hidden="true"
            >
              <div id="pierre-embed-modal-shell">
                <button type="button" id="pierre-embed-modal-close" aria-label="Fermer">
                  <span aria-hidden="true">✕</span>
                </button>
                <div id="pierre-embed-modal-body">
                  <div id="pierre-embed-modal-chat"><div id="root"></div></div>
                </div>
              </div>
            </div>`
          : html`<div id="root"></div>`
      }`
  })
}
