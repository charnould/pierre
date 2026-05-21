import { JSDOM } from 'jsdom'
import { format } from 'oxfmt'
import TurndownService from 'turndown'

// ── Wikipedia pages to scrape ────────────────────────────────────────────────
// Add or uncomment entries to expand the knowledge base.
// Page names must be URL-encoded (e.g. %27 for apostrophes).

const WIKIPEDIA_PAGES = [
  'Agence_nationale_de_contrôle_du_logement_social',
  'Agence_nationale_de_l%27habitat',
  'Agence_nationale_pour_la_rénovation_urbaine',
  'Aide_au_logement',
  'Centre_d%27hébergement_d%27urgence',
  'Centre_national_des_œuvres_universitaires_et_scolaires',
  'Centre_régional_des_œuvres_universitaires_et_scolaires',
  'Code_de_la_construction_et_de_l%27habitation',
  'Crises_du_logement_en_France',
  'Droit_au_logement_en_France',
  'Emmanuelle_Cosse',
  'Entreprise_sociale_pour_l%27habitat',
  'Fondation_Abbé-Pierre_pour_le_logement_des_défavorisés',
  'Garantie_universelle_des_loyers',
  'Habitation_à_loyer_modéré_(France)',
  'Historique_du_logement_social_en_France',
  'Logement_étudiant_en_France',
  'Logement_intermédiaire',
  'Logement_social_en_France',
  'Loi_d%27orientation_et_de_programmation_pour_la_ville_et_la_rénovation_urbaine',
  'Loi_portant_évolution_du_logement,_de_l%27aménagement_et_du_numérique',
  'Loi_pour_l%27accès_au_logement_et_un_urbanisme_rénové',
  'Loi_relative_à_la_différenciation,_la_décentralisation,_la_déconcentration_et_portant_diverses_mesures_de_simplification_de_l%27action_publique_locale',
  'Loi_relative_à_la_solidarité_et_au_renouvellement_urbains',
  'Ministre_du_Logement',
  'Mixité_sociale_en_France',
  'Organisme_d%27habitations_à_loyer_modéré_(France)',
  'Participation_des_employeurs_%C3%A0_l%27effort_de_construction',
  'Prêt_locatif_à_usage_social',
  'Prêt_locatif_intermédiaire',
  'Prêt_locatif_social',
  'Quartier_prioritaire_de_la_politique_de_la_ville',
  'Union_sociale_pour_l%27habitat',
  'Valérie_Létard',
  'Vincent_Jeanbrun',
  'Louis_Loucheur'
]

// ── Constants ────────────────────────────────────────────────────────────────

/** Output directory for generated Markdown files. */
const WIKI_OUTPUT_DIR = 'knowledge/Wikipédia'

/** Delay between requests to avoid hammering the Wikipedia API. */
const RATE_LIMIT_MS = 2000

/**
 * Section headings whose entire content should be dropped from the output.
 * These sections (references, external links, navigation aids, …) add noise
 * without value for a text-only knowledge base.
 */
const SECTIONS_TO_REMOVE = new Set([
  'Annexe',
  'Annexes',
  'Articles connexes',
  'Bibliographie',
  'Galerie',
  'Lien externe',
  'Liens',
  'Liens externes',
  'Notes',
  'Notes et références',
  'Pour approfondir',
  'Références',
  'Sources',
  'Voir aussi'
])

/** CSS selectors for elements that never carry useful encyclopaedic text. */
const NOISE_SELECTORS = [
  '.bandeau-container',
  '.bandeau-portail',
  '.bandeau-article',
  '.homonymie',
  '.hatnote',
  '.metadata',
  '.mw-editsection',
  'figure',
  '.thumb',
  '.gallery',
  '.infobox',
  '.infobox_v2',
  '.infobox-geography',
  'table.infobox',
  '.reflist',
  '.references',
  'sup.reference',
  '.navbox',
  '.catlinks',
  '.sister-wikipedia',
  '.noprint',
  '#toc',
  '.toc',
  '.mw-empty-elt'
]

// ── HTML → clean HTML ────────────────────────────────────────────────────────

/**
 * Strips Wikipedia chrome from the raw HTML returned by the `action=parse` API
 * and returns simplified HTML ready for Markdown conversion.
 *
 * Processing pipeline:
 *  1. Remove noise elements (infoboxes, banners, navboxes, images, …).
 *  2. Unwrap all `<div>` and `<span>` wrappers so the DOM becomes a flat
 *     sequence of block elements (headings, paragraphs, lists, tables).
 *  3. Remove boilerplate sections (references, external links, …) by
 *     deleting each matching heading and all its following siblings up to
 *     the next heading of equal or higher level.
 *  4. Prepend the page title as an `<h1>`.
 *
 * @param html  Raw HTML string from the Wikipedia parse API (`parse.text`).
 * @param title Human-readable page title (`parse.title`).
 * @returns     Cleaned inner HTML string.
 */
export const clean_html = (html: string, title: string): string => {
  const dom = new JSDOM(html)
  const doc = dom.window.document
  const body = doc.querySelector('.mw-parser-output') ?? doc.body

  // Step 1 — remove elements that never contain useful text
  for (const sel of NOISE_SELECTORS) {
    for (const el of body.querySelectorAll(sel)) el.remove()
  }

  // Step 2 — unwrap <div> and <span> wrappers (inner-first via reverse())
  // so headings become flat direct siblings of their content paragraphs.
  for (const tag of ['div', 'span'] as const) {
    for (const el of Array.from(body.querySelectorAll(tag)).reverse()) {
      const parent = el.parentNode
      if (!parent) continue
      while (el.firstChild) parent.insertBefore(el.firstChild, el)
      el.remove()
    }
  }

  // Step 3 — remove boilerplate sections
  for (const heading of Array.from(body.querySelectorAll('h2, h3, h4'))) {
    if (!SECTIONS_TO_REMOVE.has(heading.textContent?.trim() ?? '')) continue

    const level = parseInt(heading.tagName[1]!, 10)
    const to_remove: Element[] = [heading]
    let sibling = heading.nextElementSibling

    while (sibling) {
      if (
        ['H1', 'H2', 'H3', 'H4'].includes(sibling.tagName) &&
        parseInt(sibling.tagName[1]!, 10) <= level
      )
        break
      to_remove.push(sibling)
      sibling = sibling.nextElementSibling
    }

    for (const el of to_remove) el.remove()
  }

  // Step 4 — prepend the page title as the top-level heading
  const h1 = doc.createElement('h1')
  h1.textContent = title
  body.prepend(h1)

  return body.innerHTML
}

// ── Clean HTML → Markdown ────────────────────────────────────────────────────

/**
 * Converts the cleaned Wikipedia HTML to Markdown using Turndown.
 *
 * Custom rules applied on top of the defaults:
 * - **images** – all `<img>`, `<figure>` and `<figcaption>` are dropped.
 * - **tables** – wikitables are rendered as GFM pipe tables.
 * - **links**  – all `<a>` tags are stripped; only their text is kept.
 *
 * Unicode clean-up is applied after conversion:
 * - Non-breaking spaces (`\u00A0`) → regular spaces.
 * - Zero-width and directional marks are removed.
 *
 * @param html Cleaned HTML string produced by {@link clean_html}.
 * @returns    Markdown string.
 */
export const html_to_markdown = (html: string): string => {
  const td = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
  })

  td.addRule('images', {
    filter: ['img', 'figure', 'figcaption'],
    replacement: () => ''
  })

  td.addRule('table', {
    filter: 'table',
    replacement(_content, node) {
      const rows = Array.from((node as HTMLTableElement).querySelectorAll('tr'))
      if (rows.length === 0) return ''

      const to_row = (cells: Element[]) =>
        `| ${cells.map((c) => c.textContent?.trim().replace(/\|/g, '\\|') ?? '').join(' | ')} |`

      const header_cells = Array.from(rows[0]!.querySelectorAll('th, td'))
      const separator = `| ${header_cells.map(() => '---').join(' | ')} |`
      const body_rows = rows
        .slice(1)
        .map((r) => to_row(Array.from(r.querySelectorAll('th, td'))))
        .join('\n')

      return `\n\n${to_row(header_cells)}\n${separator}\n${body_rows}\n\n`
    }
  })

  td.addRule('links', {
    filter: 'a',
    replacement: (_content, node) => node.textContent ?? ''
  })

  return td
    .turndown(html)
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B|\u200C|\u200D|\u200E|\u200F|\uFEFF/g, '')
}

// ── Page processor ───────────────────────────────────────────────────────────

/**
 * Converts a single Wikipedia page (HTML) to a formatted Markdown file
 * and writes it to {@link WIKI_OUTPUT_DIR}.
 *
 * @param title Human-readable page title used as the filename and H1.
 * @param html  Raw HTML from the Wikipedia parse API.
 */
const process_wikipedia_page = async (title: string, html: string): Promise<void> => {
  const cleaned = clean_html(html, title)
  const markdown = html_to_markdown(cleaned)
  const { code } = await format('a.md', markdown)
  await Bun.write(`${WIKI_OUTPUT_DIR}/${title}.md`, code)
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Fetches each page listed in {@link WIKIPEDIA_PAGES} from the French Wikipedia
 * parse API, converts the result to Markdown, and writes one `.md` file per
 * page to {@link WIKI_OUTPUT_DIR}.
 *
 * A {@link RATE_LIMIT_MS} delay is applied between requests to comply with
 * Wikipedia's API usage guidelines.
 */
export const scrape_wikipedia = async (): Promise<void> => {
  for (const page of WIKIPEDIA_PAGES) {
    try {
      await Bun.sleep(RATE_LIMIT_MS)

      const response = await fetch(
        `https://fr.wikipedia.org/w/api.php?action=parse&prop=text&formatversion=2&format=json&redirects=true&page=${page}`,
        {
          headers: {
            'User-Agent': 'PIERRE/1.0 (contact: charnould@pierre-ia.org)'
          }
        }
      )

      if (!response.ok) {
        console.error(`❌ Scraping failed:"${page}"`)
        continue
      }

      let json: { parse: { title: string; text: string } }

      try {
        json = JSON.parse(await response.text())
      } catch {
        continue
      }

      await process_wikipedia_page(json.parse.title, json.parse.text)
      console.log(`👉 Scraped: "${page}"`)
    } catch (e) {
      console.error(`❌ Scraping failed: "${page}"`, e)
    }
  }

  console.log('✅ Wikipedia scraped')
}

if (import.meta.main) await scrape_wikipedia()
