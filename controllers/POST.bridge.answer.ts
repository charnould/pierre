import type { Context } from 'hono'
import { augment_query } from '../utils/augment-query'
import { AIContext } from '../utils/_schema'
import { get_conversation, save_reply } from '../utils/handle-conversation'
import { generate_embeddings, vector_search } from '../utils/search-by-vectors'
import { bm25_search } from '../utils/search-by-bm25'
import { rank_chunks } from '../utils/rank-chunks'
import { convert_pdf_to_webp } from '../utils/convert-pdf-to-webp'
import { generate_text } from '../utils/generate-output'
import { today_is } from '../utils/generate-answer'
import { compile_prompt } from '../utils/compile_prompt'
import { get_skill } from '../utils/handle-skill'

// WIP
export const controller = async (c: Context) => {
  const form = await c.req.formData()
  const source = form.get('source') as string
  const contexty = form.get('context') as string
  const usecase = form.get('usecase') as string
  const files: File[] = form.getAll('files') as File[]

  console.log('context:', contexty)
  console.log('usecase:', usecase)
  console.log('source:', source)
  console.log('files:', files)

  const skill = await get_skill(usecase)

  const context = await AIContext.parseAsync({
    config: (await import(`../assets/bridge/config`)).default,
    metadata: { user: 'bridge@pierre-ia.org' },
    conv_id: Bun.randomUUIDv7(),
    custom_data: { raw: [] },
    content: source,
    role: 'user'
  })

  await save_reply(context)

  context.conversation = (await get_conversation(context.conv_id)) as AIContext['conversation']
  context.query = await augment_query(context)

  const embeddings = await generate_embeddings(
    [context.content, ...context.query.standalone_questions, ...context.query.search_queries],
    { provider: 'ollama', batch: true }
  )

  const v = await Promise.all(embeddings.map((v) => vector_search(v, context)))
  const k = await Promise.all(context.query.bm25_keywords.map((k) => bm25_search(k, context)))

  // TODO: v and k must not return undefined must not return undefined
  context.chunks = await rank_chunks(
    v.filter((chunk) => chunk !== undefined),
    k.filter((chunk) => chunk !== undefined),
    context
  )

  // Compile prompt
  // const prompt = await compile_prompt(context.config.id, 'answer', {
  //   today: today_is(),
  //   lang: context.query?.lang,
  //   user_query: context.content,
  //   location: context.config.knowledge.location,
  //   internal_materials: context.chunks.proprietary
  //     ?.map((c) => `<chunk source="${c.chunk_file}">\n${c.chunk_text}\n</chunk>\n`)
  //     .join(''),
  //   community_materials: context.chunks.community
  //     ?.map((c) => `<chunk source="${c.chunk_file}">\n${c.chunk_text}\n</chunk>\n`)
  //     .join('')
  // })

  const prompt = 'raconte une blague'

  const test = await generate_text({
    model: context.config.models.answer_with,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          // Introduce documents
          ...(files.length > 0
            ? [
                {
                  type: 'text' as const,
                  text:
                    files.length === 1
                      ? "Below is a document relevant to the user's request. Use it as reference material when answering."
                      : "Below are documents relevant to the user's request. Use them as reference material when answering."
                }
              ]
            : []),
          // Add documents in b64 format
          ...(await Promise.all(
            files.map(async (file) => ({
              type: 'image' as const,
              image: await convert_pdf_to_webp(file)
            }))
          )),
          // Send prompt with instructions
          { type: 'text', text: prompt }
        ]
      }
    ]
  })

  console.log(test)

  // Add prompt to conversation history
  //context.conversation.push({ role: 'user', content: prompt })

  // TODO: generate answer = mess
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
