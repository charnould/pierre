import type { Context } from 'hono'
import { generate_text } from '../utils/generate-output'
import { groq } from '@ai-sdk/groq'

export const controller = async (c: Context) => {
  try {
    const ai = await generate_text({
      max_tokens: 50,
      model: {
        model: groq('qwen/qwen3-32b'),
        providerOptions: {
          groq: {
            reasoningFormat: 'raw',
            reasoningEffort: 'default',
            serviceTier: 'auto'
          }
        }
      },
      messages: [
        {
          role: 'user',
          content:
            'Un locataire (nommé Gustave EIFFEL) vous écrit pour demander ce qu’est le Surloyer de solidarité dans le contexte du logement social. Rédigez une réponse en 5 à 10 lignes maximum, dans un style d’email professionnel (sans objet). La signature **doit** être Sophie, chez Grand Dijon Habitat (2 bis Rue Maréchal Leclerc, 21070 Dijon Cedex, 03 80 71 84 00)'
        }
      ]
    })
    console.log(ai)
    return c.text(ai)
  } catch {}
}
