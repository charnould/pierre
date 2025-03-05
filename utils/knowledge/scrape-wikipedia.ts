import * as prettier from 'prettier'
import TurndownService from 'turndown'
import type { Knowledge } from './_run'

export const scrape_wikipedia = async (knowledge: Knowledge) => {
  if (knowledge.community === true) {
    // Wikipédia pages currently scrapped.
    // Add/remove any relevant pages.
    const pages = [
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
      'Valérie_Létard'
    ]

    try {
      for await (const page of pages) {
        // Show respect to Wikipedia
        Bun.sleep(1000 * 2)

        // Get data from Wikipédia API
        const json = await (
          await fetch(
            `https://fr.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&redirects=true&titles=${page}`
          )
        ).json()

        for (const p in json.query.pages) {
          const page = json.query.pages[p]

          // Cleanup data
          let html = page.extract
            .replace(/<span[^>]*>/g, '')
            .replace(/<\/span>/g, '')
            .replace(/<time[^>]*>/g, '')
            .replace(/<\/time>/g, '')
            .replace(/<abbr[^>]*>/g, '')
            .replace(/<\/abbr>/g, '')
            .replace(/<br>/g, '')
            .replace(/<br>/g, '')
            .replace(/<dl>/g, '')
            .replace(/<dd>/g, '')
            .replace(/<\/dl>/g, '')
            .replace(/<\/dd>/g, '')
            .replace(/<i>/g, '')
            .replace(/<b>/g, '')
            .replace(/<\/i>/g, '')
            .replace(/<\/b>/g, '')
            .replace(/<p><\/p>/g, '')
            .replace(/class="[^"]*"/g, '')
            .replace(/style="[^"]*"/g, '')
            .replace(/ id="[^"]*"/g, '')

          html = `<h1>${page.title}</h1>\n${html}`
          html = html.split(
            /<h2>(Annexes|Notes et références|Références|Voir aussi|Liens externes|Articles connexes|Pour approfondir|Notes|Galerie)<\/h2>/gm
          )

          let markdown = new TurndownService({ headingStyle: 'atx' }).turndown(html[0])
          markdown = await prettier.format(markdown, { parser: 'markdown' })

          await Bun.write(`knowledge/wikipedia/${page.title}.md`, markdown)
        }
      }

      console.log('✅ wikipedia scrapped')
    } catch (e) {
      console.log('🆘 wikipedia scrapping failed')
      console.log(e)
      return
    }
  }

  return
}
