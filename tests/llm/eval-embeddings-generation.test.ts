import { expect, it } from 'bun:test'
import { generate_embeddings } from '../../utils/search-by-vectors'

const strings = [
  'Pour déposer un dossier de demande de logement social',
  'Comment rédiger mon préavis de congé pour mon logement ?',
  'Quel modèle de courrier puis-je utiliser pour mon préavis de congé ?',
  'Pour déposer votre préavis de congé pour votre logement, vous devez rédiger une lettre recommandée avec accusé de réception à votre propriétaire ou à l\'agence immobilière. Assurez-vous d\'inclure vos coordonnées, celles du destinataire, la date de votre départ souhaitée et la mention de votre préavis. Voici un modèle de courrier : "Objet : Préavis de congé. Madame, Monsieur, je vous informe par la présente de ma décision de quitter le logement situé à [adresse] à compter du [date]. Je vous remercie de bien vouloir accuser réception de ce préavis. Cordialement, [votre nom]."',
  "Il est important de vérifier la durée de préavis requise dans votre contrat de location, qui est généralement de trois mois pour un logement vide et d'un mois pour un logement meublé.",
  "Pensez à conserver une copie de votre lettre et l'accusé de réception pour vos dossiers, cela peut être utile en cas de litige ultérieur.Pourquoi est-il important de respecter les délais de préavis dans un contrat de location ?",
  'Comment la gestion de votre logement actuel pourrait-elle influencer vos choix de logement futurs ? Comment rédiger un préavis de congé pour un logement en France ?',
  "Quelles sont les obligations légales d'un locataire lors de la résiliation d'un bail ?",
  'Modèle de lettre de préavis de congé pour un appartement en location.'
]

const tests = 20

it('should generate embeddings with Ollama', async () => {
  console.log('----------------')

  let total_duration = 0

  for (let t = 0; t < tests; t++) {
    const to = performance.now()
    await generate_embeddings(strings, { provider: 'ollama', batch: true })
    const t1 = performance.now()
    const duration = t1 - to
    total_duration += duration
    console.log('test:', duration.toFixed(3), 'ms')
  }

  const avg = total_duration / tests
  const sum = total_duration

  console.log('----------------')
  console.log('avg:', `${avg.toFixed(3)} ms`)
  console.log('sum:', `${sum.toFixed(3)} ms`)
  console.log('----------------')

  expect(avg).toBeLessThan(300)
  expect(sum).toBeLessThan(6000)
})

it('should generate embeddings with Hugging Face', async () => {
  console.log('----------------')

  let total_duration = 0

  for (let t = 0; t < tests; t++) {
    const to = performance.now()
    for await (const string of strings) {
      const r = await generate_embeddings([string], {
        provider: 'huggingface',
        batch: false
      })
      console.log(r)
    }
    const t1 = performance.now()
    const duration = t1 - to
    total_duration += duration
    console.log('test:', duration.toFixed(3), 'ms')
  }

  const avg = total_duration / tests
  const sum = total_duration

  console.log('----------------')
  console.log('avg:', `${avg.toFixed(3)} ms`)
  console.log('sum:', `${sum.toFixed(3)} ms`)
  console.log('----------------')

  expect(avg).toBeLessThan(300)
  expect(sum).toBeLessThan(6000)
})
