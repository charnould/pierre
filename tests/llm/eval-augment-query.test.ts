import { expect, test } from 'bun:test'
import { augment_query } from '../../utils/augment-query'

test('evaluate query augmentation perf.', async () => {
  // A dummy context to test the augmentation of a query
  const context = {
    config: {
      id: 'pierre-ia.org',
      context: {
        default: {
          models: {
            embed_with: 'text-embedding-3-large',
            // Change `augment_with` to test different models
            augment_with: "openai('gpt-4o-mini-2024-07-18')",
            rerank_with: "openai('gpt-4o-mini-2024-07-18')",
            answer_with: "openai('gpt-4o-mini-2024-07-18')"
          }
        }
      }
    },
    current_context: 'default',
    conversation: [
      // { role: 'user', content: 'Tu es trop con !' },
      // { role: 'user', content: 'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?' }
      // { role: 'user', content: 'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?' },
      // { role: 'user', content: 'كيفية الاتصال بالمكتب الرئيسي لبلدية Grand Dijon Habitat؟' }
      // { role: 'user', content: 'Quelle est la procédure si un locataire est bloqué dans un ascenseur ?' }
      { role: 'user', content: 'qui est Obama ?' }
      // { role: 'user', content: "bonjour" },
      // { role: 'user', content: " كيفية الاتصال بالمكتب الرئيسي لبلدية Grand Dijon Habitat؟" },
      // { role: 'user', content: 'qui est xavier nicolas ?' }
      // { role: 'user', content: 'Comment joindre Proxiserve ?' }
      // { role: 'user', content: 'quell est el chauffage de la résidence Les Pleiades ?' },
      // { role: 'user', content: "Si il y a une absence partielle d'électricité dans les parties communes à 23h dans l'ilot Corse, dois je sortir (je suis agent d'astreinte)" }
      // { role: 'user', content: "Qui est d'astrein,te en ce moment ?" },
      // { role: 'user', content: "qui est d'astreinte en ce moment" }
      // { role: 'user', content: 'qui al es clés des portes anti-squat ?' },
      // { role: 'user', content: "Bonjour, mon voisin fait du bruit tous les soirs, que puis-je faire et il en tord ? j'hahbite à piolenc et orange" }
      // { role: 'user', content: 'comment déposer une demande de logement social' },
      // { role: 'assistant', content: 'Rendez-vous sur le site dédié' },
      // { role: 'user', content: "c'est pour un T3 près de Paris" },
      // { role: 'assistant', content: "entendu, je réfléchis" },
      // { role: 'user', content: "si c'est important, je suis célibataire avec 2 enfants à charge" }
    ]
  }

  await augment_query(context)

  // Dummy expect: this test is manually checked/used
  expect(true).toBe(true)
})
