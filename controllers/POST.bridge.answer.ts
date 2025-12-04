import type { Context } from 'hono'

// WIP
export const controller = async (c: Context) => {
  const form = await c.req.formData()
  const source = form.get('source') as string
  const context = form.get('context') as string
  const files: File[] = form.getAll('files') as File[]

  // const config = (await import(`../assets/bridge/config`)).default
  // const model = config.models.answer_with

  console.log('context:', context)
  console.log('source:', source)
  console.log('files:', files)

  await Bun.sleep(3000)

  const mess = `Monsieur Becquerel bonjour,

Nous souhaitons tout d’abord vous présenter nos excuses pour le délai de traitement de votre demande et pour le fait que vous ayez dû vous déplacer à quatre reprises en agence sans obtenir de réponse rapide. Nous comprenons parfaitement votre frustration et regrettons les désagréments occasionnés.

Nous faisons suite à votre message concernant votre quittance de loyer du mois de juillet.

Votre loyer précédemment était de 693,45 €. Sur cette quittance, vous avez constaté l’apparition d’une nouvelle ligne intitulée “SLS” d’un montant de 47,93 €.

Le SLS correspond au Supplément de Loyer de Solidarité, également appelé surloyer. Il s’applique aux locataires dont les ressources dépassent un certain plafond fixé par la réglementation et vient s’ajouter au loyer principal et aux charges locatives, portant votre loyer total pour le mois de juillet à 741,38 € (693,45 € + 47,93 €).

Pourquoi cette ligne apparaît maintenant ?

La réglementation impose aux bailleurs sociaux de vérifier chaque année la situation familiale et les revenus des locataires via l’enquête Supplément de Loyer de Solidarité (SLS). Cette enquête permet de déterminer si vos ressources dépassent le plafond autorisé et, le cas échéant, de calculer le SLS applicable.

Nous constatons que vous n’aviez pas répondu à l’enquête initiale SLS envoyée le 23 mai 2025, mais après nos relances, vous nous avez informé de votre nouvelle situation familiale en date du 25 juin 2025. Conformément à la réglementation et à notre courrier du 27 juin 2025, votre surloyer est de 47,93 € ; celui-ci vous a donc été facturé sur votre quittance de juillet, et le sera également sur les prochaines.

Si vous pensez qu'il s'agit d'une erreur, n'hésitez pas à vous rapprocher de nos services, joignables au (04 xx xx xx xx ou par email au xxx@yyyy.fr).

Cordialement à vous,

- L'équipe de XXXX Habitat`

  return c.text(mess)
}
