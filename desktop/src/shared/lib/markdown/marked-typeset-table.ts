import { Renderer, type MarkedExtension, type Tokens } from 'marked'

/** Wide GFM tables scroll instead of compressing — Typeset `.typeset-scroll`. */
export const markedTypesetTableRenderer: MarkedExtension = {
  renderer: {
    table(token: Tokens.Table) {
      return `<div class="typeset-scroll">${Renderer.prototype.table.call(this, token)}</div>`
    }
  }
}
