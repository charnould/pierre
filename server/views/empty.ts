import { html } from 'hono/html'

import { htmlPage } from './document'

export function emptyPage() {
  return htmlPage({
    title: 'Rien de public ici !',
    bodyClass: 'bg-background grid min-h-screen place-items-center p-4',
    body: html`<img src="/branding/lock.svg" alt="" width="80" height="96" class="h-80 w-auto" />`
  })
}
