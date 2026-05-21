import { describe, expect, it } from 'bun:test'

import { clean_html, html_to_markdown } from '../../../utils/knowledge/scrape-wikipedia'

// ─── clean_html ───────────────────────────────────────────────────────────────

describe('clean_html', () => {
  describe('H1 title', () => {
    it('prepends the page title as an <h1>', () => {
      const result = clean_html('<div class="mw-parser-output"><p>Contenu.</p></div>', 'Mon titre')
      expect(result).toContain('<h1>Mon titre</h1>')
    })
  })

  describe('noise removal', () => {
    it('removes .infobox elements', () => {
      const html =
        '<div class="mw-parser-output"><table class="infobox"><tr><td>Données</td></tr></table><p>Texte utile.</p></div>'
      const result = clean_html(html, 'Page')
      expect(result).not.toContain('Données')
      expect(result).toContain('Texte utile.')
    })

    it('removes .reflist elements', () => {
      const html =
        '<div class="mw-parser-output"><p>Corps.</p><div class="reflist">Références</div></div>'
      const result = clean_html(html, 'Page')
      expect(result).not.toContain('Références')
      expect(result).toContain('Corps.')
    })

    it('removes .navbox elements', () => {
      const html =
        '<div class="mw-parser-output"><p>Corps.</p><div class="navbox">Navigation</div></div>'
      const result = clean_html(html, 'Page')
      expect(result).not.toContain('Navigation')
    })

    it('removes .hatnote elements', () => {
      const html =
        '<div class="mw-parser-output"><div class="hatnote">Voir aussi</div><p>Corps.</p></div>'
      const result = clean_html(html, 'Page')
      expect(result).not.toContain('Voir aussi')
    })

    it('removes figure elements', () => {
      const html =
        '<div class="mw-parser-output"><figure><img src="x.png"/><figcaption>Légende</figcaption></figure><p>Corps.</p></div>'
      const result = clean_html(html, 'Page')
      expect(result).not.toContain('Légende')
    })
  })

  describe('div/span unwrapping', () => {
    it('unwraps <div> wrappers so content is preserved as flat siblings', () => {
      const html =
        '<div class="mw-parser-output"><div><div><p>Contenu imbriqué.</p></div></div></div>'
      const result = clean_html(html, 'Page')
      expect(result).toContain('Contenu imbriqué.')
    })

    it('unwraps <span> wrappers so text content is preserved', () => {
      const html =
        '<div class="mw-parser-output"><p>Texte avec <span><span>span imbriqué</span></span>.</p></div>'
      const result = clean_html(html, 'Page')
      expect(result).toContain('span imbriqué')
    })
  })

  describe('boilerplate section removal', () => {
    it('removes the "Références" section and its content', () => {
      const html = `<div class="mw-parser-output">
        <p>Corps.</p>
        <h2>Références</h2>
        <ul><li>Ref 1</li></ul>
      </div>`
      const result = clean_html(html, 'Page')
      expect(result).not.toContain('Ref 1')
      expect(result).toContain('Corps.')
    })

    it('removes the "Liens externes" section and its content', () => {
      const html = `<div class="mw-parser-output">
        <p>Corps.</p>
        <h2>Liens externes</h2>
        <ul><li>http://example.com</li></ul>
      </div>`
      const result = clean_html(html, 'Page')
      expect(result).not.toContain('http://example.com')
    })

    it('removes the "Annexes" section and its content', () => {
      const html = `<div class="mw-parser-output">
        <p>Corps principal.</p>
        <h2>Annexes</h2>
        <p>Contenu des annexes.</p>
      </div>`
      const result = clean_html(html, 'Page')
      expect(result).not.toContain('Contenu des annexes.')
      expect(result).toContain('Corps principal.')
    })

    it('stops section removal at the next heading of the same or higher level', () => {
      const html = `<div class="mw-parser-output">
        <p>Avant.</p>
        <h2>Notes et références</h2>
        <p>À supprimer.</p>
        <h2>Autre section</h2>
        <p>À conserver.</p>
      </div>`
      const result = clean_html(html, 'Page')
      expect(result).not.toContain('À supprimer.')
      expect(result).toContain('À conserver.')
    })
  })
})

// ─── html_to_markdown ────────────────────────────────────────────────────────

describe('html_to_markdown', () => {
  it('converts headings to ATX style', () => {
    const md = html_to_markdown('<h1>Titre</h1>')
    expect(md).toContain('# Titre')
  })

  it('converts paragraphs to plain text', () => {
    const md = html_to_markdown('<p>Un paragraphe.</p>')
    expect(md).toContain('Un paragraphe.')
  })

  it('strips <img> tags entirely', () => {
    const md = html_to_markdown('<p>Texte.</p><img src="photo.jpg" alt="Photo"/>')
    expect(md).not.toContain('photo.jpg')
    expect(md).not.toContain('Photo')
  })

  it('strips <a> tags but keeps their text', () => {
    const md = html_to_markdown('<p>Voir <a href="https://example.com">cet article</a>.</p>')
    expect(md).toContain('cet article')
    expect(md).not.toContain('https://example.com')
    expect(md).not.toContain('<a')
  })

  it('replaces non-breaking spaces with regular spaces', () => {
    const md = html_to_markdown('<p>Valeur\u00A0: 42\u00A0%.</p>')
    expect(md).not.toContain('\u00A0')
    expect(md).toContain('Valeur : 42 %.')
  })

  it('removes zero-width and directional Unicode marks', () => {
    const md = html_to_markdown('<p>Texte\u200Bpropre\u200D.</p>')
    expect(md).not.toMatch(/\u200B|\u200C|\u200D|\u200E|\u200F|\uFEFF/)
    expect(md).toContain('Texte')
  })

  describe('table conversion to GFM', () => {
    it('converts a simple HTML table to a GFM pipe table', () => {
      const html = `
        <table>
          <tr><th>Nom</th><th>Valeur</th></tr>
          <tr><td>Alpha</td><td>1</td></tr>
          <tr><td>Beta</td><td>2</td></tr>
        </table>`
      const md = html_to_markdown(html)
      expect(md).toContain('| Nom | Valeur |')
      expect(md).toContain('| --- | --- |')
      expect(md).toContain('| Alpha | 1 |')
      expect(md).toContain('| Beta | 2 |')
    })

    it('escapes pipe characters inside table cells', () => {
      const html = `
        <table>
          <tr><th>Info</th></tr>
          <tr><td>A | B</td></tr>
        </table>`
      const md = html_to_markdown(html)
      expect(md).toContain('A \\| B')
    })

    it('returns empty string for an empty table', () => {
      const md = html_to_markdown('<table></table>')
      expect(md.trim()).toBe('')
    })
  })
})
