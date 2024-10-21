import { expect, test } from 'bun:test'
import { enhance_query } from '../utils/enhance-query'

test('eval user query enhancement perf.', async () => {

  const context = {
    conv_id: '9efbd713-8e57-444a-94b7-47d76e1755f5',
    config: {
      id: 'pierre-ia.org',
      model: "openai('gpt-4o-mini-2024-07-18')"
    },
    role: 'user',
    timestamp: null,
    conversation: [
      { role: 'user', content: "Bonjour, mon voisin fait du bruit tous les soirs, que puis-je faire et il en tord ? j'hahbite à piolenc et orange" },
      // { role: 'assistant', content: 'Bonjour !' },
      // { role: 'user', content: 'comment déposer une demande de logement social' },
      // { role: 'assistant', content: 'Rendez-vous sur le site dédié' },
      // { role: 'user', content: "c'est pour un T3 près de Paris" },
      // { role: 'assistant', content: "entendu, je réfléchis" },
      // { role: 'user', content: "si c'est important, je suis célibataire avec 2 enfants à charge" }

    ]
  }

  const enhanced_query = await enhance_query(context)

  console.log(`\n\n------------ ${new Date().toISOString().substring(0, 19)} ------------\n`)
  console.log(enhanced_query)
  console.log('\n\n')

  // Dummy expect: this test in manually checked/used
  expect(true).toBe(true)
})
