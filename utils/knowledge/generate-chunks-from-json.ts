import type Database from 'bun:sqlite'
import chalk from 'chalk'
import ora from 'ora'
import * as prettier from 'prettier'
import { generate_hash } from '../../utils/knowledge/generate-hash'
import { db } from '../database'
import { stem } from '../stem-text'
import type { Args } from './_run'
import type { Metadata } from './save-metadata'

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

        // Load file as a JSON and iterate over each `entity`
        // `entity` is defined in _metatada.xlsx as a kind of agregate.
        const json = await Bun.file(`datastores/__temp__/${file.id}.json`).json()
        for (const [key, value] of Object.entries(json)) {
          //
          // Initialize variables
          let chunk_text = ''
          let entity_text = 'none'
          let entity_hash = 'none'

          //
          // Processing XLSX files:
          // There are two strategies for saving the data into the database:
          // Option 1. Saving the entire file as a single entity without chunking.
          // Option 2. Chunking the data into smaller, manageable pieces.
          //

          //
          // Option 1.
          // Saving the entire file as a single entity without chunking.
          if (file.chunk === false) {
            //
            // If there is no `entity` defined do not add it as a title
            chunk_text += key === 'undefined' ? '' : `# ${key}\n`

            //
            // Iterate over the array associated with the `entity`
            for (const item of value) {
              chunk_text += file.description ? `${file.description}\n` : ''
              for (const [itemKey, itemValue] of Object.entries(item)) {
                chunk_text += `- ${itemKey} : ${itemValue}\n`
              }
              chunk_text += '\n\n'
            }

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
          }

          //
          // Option 2.
          //Chunking the data into smaller, manageable pieces.
          if (file.chunk === true) {
            //
            // If there is no `entity` defined do not add it as a title
            chunk_text += key === 'undefined' ? '' : `# ${key}\n`

            //
            // Iterate over the array associated with the `entity`
            for (const item of value) {
              chunk_text += file.description ? `${file.description}\n` : ''
              for (const [itemKey, itemValue] of Object.entries(item)) {
                chunk_text += `- ${itemKey} : ${itemValue}\n`
              }
              chunk_text += '\n\n'
            }

            if (file.entity_column && file.entity_type) {
              const key = Object.keys(value[0])[file.entity_column - 1] // Get the key at the specified index
              entity_text = `${file.entity_type}: ${value[0][key]}`
              entity_hash = generate_hash(entity_text)
              console.log(entity_text)
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
          }
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
        chunk_text,
        chunk_stem,
        entity_hash,
        entity_text
      )
      VALUES (?, ?, ?, ?, ?);
     `
    )
    .run(chunk_hash, chunk.chunk_text, chunk_stem, chunk.entity_hash, chunk.entity_text)

  database.prepare('INSERT INTO stems (chunk_stem) VALUES (?);').run(chunk_stem)

  return
}
