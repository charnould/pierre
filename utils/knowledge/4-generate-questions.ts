// import { Database } from 'bun:sqlite'
// import { openai } from '@ai-sdk/openai'
// import { generateObject } from 'ai'
// import { z } from 'zod'

// // Create database
// Database.setCustomSQLite('/opt/homebrew/opt/sqlite/lib/libsqlite3.dylib') // when coding on Mac OS X
// const db = new Database('./utils/knowledge/datastore.sqlite')

// for await (const chunk of chunks) {

//       const { object } = await generateObject({
//         model: openai('gpt-4o-mini-2024-07-18'),
//         schema: z.object({
//           questions: z.array(z.string()).describe('Questions')
//         }),
//         mode: 'json',
//         messages: [
//           {
//             role: 'system',
//             content: `
//               ### CHUNK ###
//               ${chunk}

//               ### INSTRUCTION ###
//               List 5-15 questions that the chunk above answers.
//               Answer only in french language.
//               Return results in JSON.
//               `.trim() // Some LLMs don't allow trailing white space (e.g. Anthropic)
//           }
//         ]
//       })

//       // TODO: ajouter le titre de niveau 1 aux questions ?!
//       const { questions } = object
//       let questions_list = ''
//       for (const q of questions) {
//         questions_list += `- ${q}\n`
//       }

//       console.log('############\n', chunk)

//       db.prepare('INSERT INTO chunks(questions) VALUES(?);').run(questions)
//     }
//   }
// }
