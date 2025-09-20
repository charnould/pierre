import type Database from 'bun:sqlite'
import * as prettier from 'prettier'
import tiktoken from 'tiktoken'
import { db } from '../database'
import { stem } from '../stem-text'
import type { Knowledge } from './_run'
import { generate_hash } from './generate-hash'
import type { Metadata } from './store-metadata'

/**
 * Counts the number of tokens in a given string using the `o200k_base` tokenizer.
 *
 * @remarks
 * This function uses the `o200k_base` tokenizer to calculate the token count.
 * Note that the token count may not accurately reflect the tokens seen by the
 * `bge-m3` model (based on XLM-RoBERTa), which is used for embeddings.
 * The discrepancy arises because the tokenization methods differ between the
 * two models. This implementation avoids using `@huggingface/transformers`
 * for performance reasons.
 *
 * @param string - The input string to tokenize and count.
 * @returns The number of tokens in the input string.
 */
const encoder = tiktoken.get_encoding('o200k_base')
export const count_tokens = (string: string) => {
  return encoder.encode(string).length
}

//
//
//
//
//
export const chunk_json = async (knowledge: Knowledge) => {
  // This function applies only to `proprietary` knowledge
  if (knowledge.proprietary === true) {
    // Get _metadata.json
    const metadata = await Bun.file(`datastores/${Bun.env.SERVICE}/temp/.metadata.json`).json()

    // For each file described in _metadata.json
    // and it it's an XLSX file, apply the following logic
    // TODO: must be more robust
    for await (const file of metadata as Metadata) {
      if (file.type === 'xlsx') {
        // Use the right database
        let database: Database
        if (file.access === 'private') database = db('proprietary.private')
        else database = db('proprietary.public')

        // Load file as a JSON
        const json = await Bun.file(`datastores/${Bun.env.SERVICE}/temp/${file.id}.json`).json()

        // Iterate over `entity` because file content looks like:
        //
        // {
        //    "undefined": [
        //      { "désignation outillage": "rouleau de téflons",
        //        "désignation outillage_1": "rouleau de téflons",
        //        "qté en stock": 1
        //      },
        //      ...
        //    ]
        //    ...
        // }

        //
        // Initialize variables
        let tokens_count = 0
        let chunk_text = ''

        for (const [key, value] of Object.entries(json)) {
          chunk_text += key === 'undefined' ? '' : `# ${key}\n`

          // Because file content looks like:
          // [
          //   { "désignation outillage": "bouteilles d'eau",
          //     "quantité": 500
          //   },
          //   { "désignation outillage": "lampe",
          //     "quantité": 2
          //   },
          //   ...
          // ]
          // ...
          // }
          // we need to iterate over
          for (const item of value) {
            //
            //  Build Markdown structure for new chunk
            let new_chunk_text = file.description ? `${file.description}\n` : ''
            for (const [item_key, item_value] of Object.entries(item))
              new_chunk_text += `- ${item_key} : ${item_value}\n`
            new_chunk_text += '\n\n'

            //
            const potential_token_count = tokens_count + count_tokens(new_chunk_text)

            // If chunk gonna be too big for embeddigs model (8191)
            // TODO:  Why my token count is the one by openAI differs?
            //        If I put 8191 below, API throws.
            if (potential_token_count > 7_200) {
              // Save chunk
              save_chunk(
                {
                  chunk_text: chunk_text
                },
                database
              )

              // Reboot counter and chunk Markdown structure
              chunk_text = ''
              chunk_text += key === 'undefined' ? '' : `# ${key}\n`
              chunk_text += new_chunk_text
            } else {
              chunk_text += new_chunk_text
            }

            tokens_count = count_tokens(chunk_text)
          }

          save_chunk(
            {
              chunk_text: chunk_text
            },
            database
          )

          chunk_text = ''
          tokens_count = 0
        }
      }
    }

    console.log('✅ tabular chunks created')
    return
  }
}

//
//
//
//
// Helper Function: Save a chunk to the database
//
// This function handles storing a chunk in the database along with its metadata,
// including hash values, text, stemming, and associated entity details.
const save_chunk = async (chunk: { chunk_text: string }, database: Database) => {
  // Prepare and process the chunk:
  // 1. Format the chunk using Prettier for clean and consistent Markdown formatting.
  // 2. Generate a unique hash for the chunk to serve as its identifier in the database.
  // 3. Create a stemmed version of the chunk for optimized FTS5/BM25 search indexing.
  chunk.chunk_text = await prettier.format(chunk.chunk_text, {
    parser: 'markdown'
  })
  const chunk_hash = generate_hash(chunk.chunk_text)
  const chunk_stem = stem(chunk.chunk_text)

  // Save the chunk data to the database:
  // 1. Insert the chunk into the `chunks` table.
  // 2. Add the chunk's stemmed version into the `stems` table to allow BM25 search.
  database
    .prepare(
      `
      INSERT INTO chunks (
        chunk_hash,
        chunk_tokens,
        chunk_text,
        chunk_stem
      )
      VALUES (?, ?, ?, ?);
     `
    )
    .run(chunk_hash, count_tokens(chunk.chunk_text), chunk.chunk_text, chunk_stem)

  database.prepare('INSERT INTO stems (chunk_stem) VALUES (?);').run(chunk_stem)

  return
}
