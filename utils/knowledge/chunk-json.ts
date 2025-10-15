import * as prettier from 'prettier'
import tiktoken from 'tiktoken'
import { db, Db_Name } from '../database'
import { stem } from '../stem-text'
import type { Knowledge } from './_run'
import { hash_filename } from './generate-hash'
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

/**
 * Processes proprietary knowledge files described in the datastore metadata and splits
 * tabular (XLSX-derived) content into size-limited Markdown chunks suitable for embedding.
 *
 * Behaviour and side effects:
 * - No-op if the supplied knowledge is not proprietary.
 * - Loads datastore metadata from `datastores/${Bun.env.SERVICE}/metadata.json` and
 *   iterates over each entry (expected shape: Metadata[]).
 * - For each metadata entry:
 *   - Skips processing when the referenced file does not exist on disk.
 *   - Skips processing when `file.need_rebuild` is false.
 *   - Only processes entries with `file.type === 'xlsx'`.
 * - For XLSX files it expects a pre-converted JSON at:
 *   `datastores/${Bun.env.SERVICE}/temp/${file.id}.json`. That JSON is expected to be an
 *   object whose keys are sheet/section names and whose values are arrays of row objects.
 * - Iterates rows and builds Markdown for each row (prepends file.description when present).
 * - Accumulates Markdown into a chunk string and uses `count_tokens` to limit chunk size.
 *   When the potential token count exceeds the configured threshold (currently 7_200),
 *   the accumulated chunk is persisted immediately using `save_chunk(...)`.
 * - Every final chunk (including any remainder after a sheet) is persisted via `save_chunk(...)`
 *   with the provided `rebuild_at` set as `chunk_build`. Persisted chunks include
 *   `chunk_access`, `chunk_file`, and `db_name: 'proprietary'`.
 * - Writes / reads are performed via Bun APIs (e.g. `Bun.file(...).json()`, `f.exists()`).
 * - Logs a completion message "✅ Tabular chunks created" on success.
 *
 * @param knowledge - Knowledge descriptor object. Processing is applied only when `knowledge.proprietary` is truthy.
 * @param rebuild_at - Identifier used to tag chunks created during this run (written to `chunk_build`).
 * @returns A Promise that resolves when processing and persistence of all applicable chunks completes.
 *
 */
export const chunk_json = async (knowledge: Knowledge, rebuild_at: string) => {
  // `chunk_json` applies only to proprietary knowledge
  if (!knowledge.proprietary) return

  // Get _metadata.json
  const metadata = await Bun.file(`datastores/${Bun.env.SERVICE}/metadata.json`).json()

  // For each file described in _metadata.json
  // and it it's an XLSX file, apply the following logic
  // TODO: must be more robust
  for await (const file of metadata as Metadata[]) {
    //  if file does not exist in filesystem
    // skips the rest of the current loop iteration and moves to the next item.
    const f = Bun.file(file.filepath)
    const exists = await f.exists()
    if (!exists) continue

    // Skip processing if the file DOES NOT need rebuild
    // (need_rebuild = false)
    if (!file.need_rebuild) continue

    if (file.type === 'xlsx') {
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
            save_chunk({
              chunk_build: rebuild_at,
              chunk_text: chunk_text,
              chunk_access: file.access as string,
              chunk_file: file.filename,
              db_name: 'proprietary'
            })

            // Reboot counter and chunk Markdown structure
            chunk_text = ''
            chunk_text += key === 'undefined' ? '' : `# ${key}\n`
            chunk_text += new_chunk_text
          } else {
            chunk_text += new_chunk_text
          }

          tokens_count = count_tokens(chunk_text)
        }

        save_chunk({
          chunk_text: chunk_text,
          chunk_access: file.access as string,
          chunk_build: rebuild_at,
          chunk_file: file.filename,
          db_name: 'proprietary'
        })

        chunk_text = ''
        tokens_count = 0
      }
    }
  }

  console.log('✅ Tabular chunks created')
  return
}

/**
 * Persist a processed text chunk into the application's database.
 *
 * This asynchronous helper:
 * 1. Formats the provided chunk text using Prettier (Markdown parser) for consistent storage.
 * 2. Generates a unique identifier (chunk_hash) from the formatted text.
 * 3. Produces a stemmed version of the text for full‑text/BM25 search indexing.
 * 4. Counts tokens for the chunk (used for metadata / quota purposes).
 * 5. Inserts a record into the `chunks` table and inserts the stemmed text into the `stems` table.
 *
 * @param params - Named parameters object.
 * @param params.db_name - Logical database identifier to select which DB instance to use.
 * @param params.chunk_text - Raw chunk content to format, analyze and persist. This value is formatted (Prettier) before storage.
 * @param params.chunk_file - Origin file path or identifier associated with the chunk.
 * @param params.chunk_build - Identifier linking this chunk to a particular rebuild/process run.
 * @param params.chunk_access - Access level or visibility metadata for the chunk (e.g. public/private/team).
 *
 * @returns A promise that resolves once persistence completes. The function returns void on success.
 *
 * @throws If formatting (Prettier) fails, tokenization/stemming fails, or any database prepare/run operation errors.
 *
 */
const save_chunk = async ({
  chunk_build,
  chunk_text,
  chunk_access,
  chunk_file,
  db_name
}: {
  db_name: Db_Name
  chunk_text: string
  chunk_file: string
  chunk_build: string
  chunk_access: string
}) => {
  // Prepare and process the chunk:
  // 1. Format the chunk using Prettier for clean and consistent Markdown formatting.
  // 2. Generate a unique hash for the chunk to serve as its identifier in the database.
  // 3. Create a stemmed version of the chunk for optimized FTS5/BM25 search indexing.
  chunk_text = await prettier.format(chunk_text, { parser: 'markdown' })
  const chunk_hash = hash_filename(chunk_text)
  const chunk_stem = stem(chunk_text)
  const chunk_tokens = count_tokens(chunk_text)

  // Save the chunk data to the database:
  // 1. Insert the chunk into the `chunks` table.
  // 2. Add the chunk's stemmed version into the `stems` table to allow BM25 search.
  db(db_name)
    .prepare(
      `
      INSERT INTO chunks (
        chunk_hash,
        chunk_file,
        chunk_access,
        chunk_build,
        chunk_tokens,
        chunk_text
      )
      VALUES (?, ?, ?, ?, ?, ?);
     `
    )
    .run(chunk_hash, chunk_file, chunk_access, chunk_build, chunk_tokens, chunk_text)

  db(db_name).prepare('INSERT INTO stems (chunk_stem) VALUES (?);').run(chunk_stem)

  return
}
