import type Database from 'bun:sqlite'
import chalk from 'chalk'
import ora from 'ora'
import * as prettier from 'prettier'
import tiktoken from 'tiktoken'
import { generate_hash } from '../../utils/knowledge/generate-hash'
import { db } from '../database'
import { stem } from '../stem-text'
import type { Args } from './_run'
import type { Metadata } from './save-metadata'

// https://platform.openai.com/tokenizer
// https://github.com/openai/openai-cookbook/blob/main/examples/How_to_count_tokens_with_tiktoken.ipynb
const encoder = tiktoken.get_encoding('o200k_base')

export const count_tokens = (string: string) => {
  return encoder.encode(string).length
}

export const generate_chunks_from_json = async (args: Args) => {
  // This function applies only to `proprietary` knowledge
  if (args['--proprietary'] === true) {
    // Start spinner and get _metadata.json
    const spinner = ora('Génération des chunks tabulaires').start()
    const metadata = await Bun.file('datastores/__temp__/.metadata.json').json()

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
        const json = await Bun.file(`datastores/__temp__/${file.id}.json`).json()

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
        let entity_text = 'none'
        let entity_hash = 'none'
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
            const potentiel_token_count = tokens_count + count_tokens(new_chunk_text)

            // If chunk gonna be too big for embeddigs model (8191)
            // TODO:  Why my token count is the one by openAI differs?
            //        If I put 8191 below, API throws.
            if (potentiel_token_count > 7_100) {
              //
              // Generate entity
              if (file.entity_column && file.entity_type) {
                const key = Object.keys(value[0])[file.entity_column - 1]
                entity_text = `${file.entity_type}: ${value[0][key]}`
                entity_hash = generate_hash(entity_text)
              }

              // Save chunk
              save_chunk(
                {
                  chunk_text: chunk_text,
                  entity_hash: entity_hash,
                  entity_text: entity_text
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

          // At end of each `entity`,
          // save it if _metadata says so.

          // Generate entity
          if (file.entity_column && file.entity_type) {
            const key = Object.keys(value[0])[file.entity_column - 1]
            entity_text = `${file.entity_type}: ${value[0][key]}`
            entity_hash = generate_hash(entity_text)
          }

          save_chunk(
            {
              chunk_text: chunk_text,
              entity_hash: entity_hash,
              entity_text: entity_text
            },
            database
          )

          chunk_text = ''
          tokens_count = 0
        }
      }
    }

    // End spinner
    spinner.succeed(chalk.green('Chunks tabulaires générés'))
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
const save_chunk = async (
  chunk: { chunk_text: string; entity_hash: string; entity_text: string },
  database: Database
) => {
  // Prepare and process the chunk:
  // 1. Format the chunk using Prettier for clean and consistent Markdown formatting.
  // 2. Generate a unique hash for the chunk to serve as its identifier in the database.
  // 3. Create a stemmed version of the chunk for optimized FTS5/BM25 search indexing.
  chunk.chunk_text = await prettier.format(chunk.chunk_text, { parser: 'markdown' })
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
        chunk_stem,
        entity_hash,
        entity_text
      )
      VALUES (?, ?, ?, ?, ?, ?);
     `
    )
    .run(
      chunk_hash,
      count_tokens(chunk.chunk_text),
      chunk.chunk_text,
      chunk_stem,
      chunk.entity_hash,
      chunk.entity_text
    )

  database.prepare('INSERT INTO stems (chunk_stem) VALUES (?);').run(chunk_stem)

  return
}
