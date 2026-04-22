import { format } from 'oxfmt'
import TurndownService from 'turndown'

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

const RATE_LIMIT_MS = 2000
const WIKI_OUTPUT_DIR = 'knowledge/Wikipédia'
const SECTIONS_TO_REMOVE =
  /(Annexes|Notes et références|Références|Voir aussi|Liens externes|Articles connexes|Pour approfondir|Notes|Galerie)/
const HTML_CLEANUP_PATTERNS = [
  [/<span[^>]*>/g, ''],
  [/<\/span>/g, ''],
  [/<time[^>]*>/g, ''],
  [/<\/time>/g, ''],
  [/<abbr[^>]*>/g, ''],
  [/<\/abbr>/g, ''],
  [/<br>/g, ''],
  [/<dl>/g, ''],
  [/<dd>/g, ''],
  [/<\/dl>/g, ''],
  [/<\/dd>/g, ''],
  [/<i>/g, ''],
  [/<b>/g, ''],
  [/<\/i>/g, ''],
  [/<\/b>/g, ''],
  [/<p><\/p>/g, ''],
  [/class="[^"]*"/g, ''],
  [/style="[^"]*"/g, ''],
  [/ id="[^"]*"/g, '']
] as const

const turndownService = new TurndownService({ headingStyle: 'atx' })

function cleanHtml(html: string): string {
  return HTML_CLEANUP_PATTERNS.reduce(
    (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
    html
  )
}

function removeBoilerplateSections(html: string): string {
  const sections = html.split(new RegExp(`<h2>${SECTIONS_TO_REMOVE.source}</h2>`, 'gm'))
  return sections[0]
}

async function processWikipediaPage(
  pageTitle: string,
  pageData: { title: string; extract: string }
): Promise<void> {
  let html = cleanHtml(pageData.extract)
  html = `<h1>${pageData.title}</h1>\n${html}`
  html = removeBoilerplateSections(html)

  const markdown = turndownService.turndown(html)
  const { code } = await format('a.md', markdown)
  await Bun.write(`${WIKI_OUTPUT_DIR}/${pageData.title}.md`, code)
}

export async function scrape_wikipedia(): Promise<void> {
  try {
    for (const page of WIKIPEDIA_PAGES) {
      await Bun.sleep(RATE_LIMIT_MS)

      const json = await (
        await fetch(
          `https://fr.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&redirects=true&titles=${page}`
        )
      ).json()

      for (const pageId in json.query.pages) {
        const pageData = json.query.pages[pageId]
        await processWikipediaPage(page, pageData)
      }
    }

    console.log('✅ Wikipedia scrapped')
  } catch (e) {
    console.error('❌ Wikipedia scrapping failed', e)
  }
}
