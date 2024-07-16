import { $ } from 'bun'
import TurndownService from 'turndown'

// Delete old Wikipédia files
await $`rm -rf knowledge/Wikipedia/{*,.*}`
console.log(' 👉 Outdated Wikipédia files deleted')

const pages = [
  'Logement_étudiant_en_France',
  'Centre_régional_des_œuvres_universitaires_et_scolaires',
  'Centre_national_des_%C5%93uvres_universitaires_et_scolaires',
  'Agence_nationale_de_contr%C3%B4le_du_logement_social',
  'Union_sociale_pour_l%27habitat',
  'Quartier_prioritaire_de_la_politique_de_la_ville',
  'Pr%C3%AAt_locatif_%C3%A0_usage_social',
  'Pr%C3%AAt_locatif_social',
  'Pr%C3%AAt_locatif_interm%C3%A9diaire',
  'Participation_des_employeurs_%C3%A0_l%27effort_de_construction',
  'Organisme_d%27habitations_%C3%A0_loyer_mod%C3%A9r%C3%A9_(France)',
  'Mixit%C3%A9_sociale_en_France',
  'Ministre_du_Logement',
  'Loi_relative_%C3%A0_la_solidarit%C3%A9_et_au_renouvellement_urbains',
  'Loi_pour_l%27acc%C3%A8s_au_logement_et_un_urbanisme_r%C3%A9nov%C3%A9',
  'Fondation_Abb%C3%A9-Pierre_pour_le_logement_des_d%C3%A9favoris%C3%A9s',
  'Loi_pour_l%27acc%C3%A8s_au_logement_et_un_urbanisme_r%C3%A9nov%C3%A9',
  'Loi_portant_%C3%A9volution_du_logement,_de_l%27am%C3%A9nagement_et_du_num%C3%A9rique',
  'Logement_social_en_France',
  'Loi_d%27orientation_et_de_programmation_pour_la_ville_et_la_r%C3%A9novation_urbaine',
  'Agence_nationale_pour_la_r%C3%A9novation_urbaine',
  'Historique_du_logement_social_en_France',
  'Guillaume_Kasbarian',
  'Garantie_universelle_des_loyers',
  'Entreprise_sociale_pour_l%27habitat',
  'Droit_au_logement_en_France',
  'Code_de_la_construction_et_de_l%27habitation'
]

for await (const u of pages) {
  Bun.sleep(1000 * 3)

  const api = `https://fr.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&redirects=true&titles=${u}`

  try {
    const response = await fetch(api)
    const html = await response.json()

    for (const pageKey in html.query.pages) {
      const page = html.query.pages[pageKey]
      const extract = page.extract
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
        .replace(/<h2>Notes et références<\/h2>.*/gs, '')

      const result = `<h1>${page.title}</h1>${extract}`

      const turndownService = new TurndownService({ headingStyle: 'atx' })
      const markdown = turndownService.turndown(result)

      await Bun.write(`knowledge/Wikipedia/${page.title}.md`, markdown)
      console.log(`  👉 ${u} saved to .md`)
    }
  } catch {
    console.log(`  🆘 ${u} has an error`)
  }
}
