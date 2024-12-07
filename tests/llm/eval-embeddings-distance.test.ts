import { expect, test } from 'bun:test'
import { cosine_similarity, generate_embeddings } from '../../utils/search-by-vectors'
import { stem } from '../../utils/stem-text'

// Cosine similarity measures the angle between two vectors and ranges from -1 to 1:
// 1: Perfect similarity (vectors are identical).
// 0: No similarity (vectors are orthogonal, meaning they share no common direction).
// -1: Perfect dissimilarity (vectors point in opposite directions).
test('filter', async () => {
  console.log(`\n\n------------ ${new Date().toISOString().substring(0, 19)} ------------\n`)
  console.log('\n\n')

  const pairs = [
    ["Process: locataire bloqué dans l'ascenseur", 'Process: ascenseur incarcération'],
    // ['doit être exactement le même embedding', 'doit être exactement le même embedding'],
    // ['york', 'renouveau'],
    ['Building: york', 'Building: york']

    // ['location:residence Voltaire', 'location:Voltaire'],
    // ['residence Rosa parks', 'probleme de tuyaux'],
    // ['appartement les pleiades', 'résidence les pleiades'],
    // ["panne d'electricite dans les parties communes", "panne d'electricité"],
    // [
    //   "FUITE D'EAU LEGERE DANS LOGEMENT AVANT OU APRES COMPTEUR",
    //   "FUITE D'EAU IMPORTANTE DANS LOGEMENT AVANT OU APRES COMPTEUR"
    // ],
    // ["probleme de coupure d'electricité", 'incarcération dans un ascenseur'],
    // [
    //   stem("probleme de fuit d'eau dans les parties communes"),
    //   stem("probleme de fuit d'eau dans les logements privatifs")
    // ],
    // [
    //   "probleme de fuit d'eau dans les parties communes",
    //   "probleme de fuit d'eau dans les logements privatifs"
    // ]
  ]

  await Promise.all(
    pairs.map(async ([string_1, string_2]) => {
      const [vector_1, vector_2] = await Promise.all([
        generate_embeddings(string_1),
        generate_embeddings(string_2)
      ])
      const result = cosine_similarity(vector_1, vector_2)
      console.log(`${result}: ${string_1}`)
    })
  )

  // Dummy expect: this test is manually checked/used
  expect(true).toBe(true)
})
