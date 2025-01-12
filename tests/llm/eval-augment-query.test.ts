import { expect, test } from 'bun:test'
import { augment_query } from '../../utils/augment-query'

// Add `.skip` to make `bun test` pass, otherwise, it'll fail
// because a missing OPENAI_API_KEY. Remove `.skip` for testing
// using `bun eval:query`

test('evaluate query augmentation perf.', async () => {
  const context = {
    conv_id: '019459ad-b40e-7000-9e5b-b72022dc4a9a',
    config: {
      id: 'pierre-ia.org',
      context: {
        default: {
          models: {
            embed_with: 'text-embedding-3-large',
            augment_with: "openai('gpt-4o-mini-2024-07-18')",
            rerank_with: "openai('gpt-4o-mini-2024-07-18')",
            answer_with: "openai('gpt-4o-mini-2024-07-18')"
          },
          phone: '0033939070074',
          protected: false,
          knowledge: { community: true, proprietary: { public: false, private: false } },
          audience:
            'The user’s primary focus is on housing, with a particular interest in social housing in France.',
          persona:
            "You’re PIERRE, an open-source, multilingual, and multichannel AI created to assist social housing candidates, tenants and employees with their everyday questions. Your source code is accessible to all at https://www.pierre-ia.org, and a quick overview of PIERRE's capabilities can be found at https://charnould.github.io/pierre/assets/PIERRE-Présentation.pdf.",
          greeting: ['Bonjour 🖐️,'],
          examples: [],
          disclaimer: 'Une IA peut se tromper. Vérifiez les informations importantes.'
        }
      }
    },
    role: 'user',
    timestamp: null,
    content: 'كيفية الاتصال بالمكتب الرئيسي لبلدية Grand Dijon Habitat؟',
    metadata: {
      topics: null,
      origin: null,
      evaluation: {
        customer: { score: null, comment: null },
        organization: { score: null, comment: null },
        ai: { score: null, comment: null },
        pierre: { score: null, comment: null }
      },
      tokens: { prompt: null, completion: null, total: null }
    },
    query: null,
    chunks: { community: [], private: [], public: [] },
    current_context: 'default',
    conversation: [
      //  { role: 'user', content: 'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?' },
      //  { role: 'user', content: 'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?' },
      { role: 'user', content: 'كيفية الاتصال بالمكتب الرئيسي لبلدية Grand Dijon Habitat؟' }
      // { role: 'user', content: 'Quelle est la procédure si un locataire est bloqué dans un ascenseur ?' }
      // { role: 'user', content: "qui est Obama ?" },
      // { role: 'user', content: "bonjour" },
      // { role: 'user', content: " كيفية الاتصال بالمكتب الرئيسي لبلدية Grand Dijon Habitat؟" },
      // { role: 'user', content: 'qui est xavier nicolas ?' }
      // { role: 'user', content: 'Comment joindre Proxiserve ?' }
      // { role: 'user', content: 'quell est el chauffage de la résidence Les Pleiades ?' },
      // { role: 'user', content: "Si il y a une absence partielle d'électricité dans les parties communes à 23h dans l'ilot Corse, dois je sortir (je suis agent d'astreinte)" }
      // { role: 'user', content: "Qui est d'astrein,te en ce moment ?" },
      // { role: 'user', content: "qui est d'astreinte en ce moment" },
      // { role: 'user', content: 'qui al es clés des portes anti-squat ?' },
      // { role: 'user', content: "Bonjour, mon voisin fait du bruit tous les soirs, que puis-je faire et il en tord ? j'hahbite à piolenc et orange" },
      // { role: 'user', content: 'comment déposer une demande de logement social' },
      // { role: 'assistant', content: 'Rendez-vous sur le site dédié' },
      // { role: 'user', content: "c'est pour un T3 près de Paris" },
      // { role: 'assistant', content: "entendu, je réfléchis" },
      // { role: 'user', content: "si c'est important, je suis célibataire avec 2 enfants à charge" }
    ]
  }

  const enhanced_query = await augment_query(context)

  console.log(`\n\n------------ ${new Date().toISOString().substring(0, 19)} ------------\n`)
  console.log(enhanced_query)
  console.log('\n\n')

  // Dummy expect: this test is manually checked/used
  expect(true).toBe(true)
})
