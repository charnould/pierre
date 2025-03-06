import type Database from 'bun:sqlite'
import { readdir } from 'node:fs/promises'
import _ from 'lodash'
import { marked } from 'marked'
import * as prettier from 'prettier'
import { db } from '../database'
import { stem } from '../stem-text'
import type { Knowledge } from './_run'
import { count_tokens } from './chunk-json'
import { generate_hash } from './generate-hash'

/**
 * Generates text chunks from markdown files
 * based on the provided knowledge object.
 *
 * @param knowledge - An object containing properties that determine which files to process.
 * @param knowledge.community - A boolean indicating whether to process community knowledge.
 * @param knowledge.proprietary - A boolean indicating whether to process proprietary knowledge.
 *
 * @returns A promise that resolves when the text chunks have been successfully generated.
 *
 * @throws Will log an error message if the text chunk generation fails.
 */
export const chunk_markdown = async (knowledge: Knowledge) => {
  try {
    //
    // Case 1 - Community knowledge
    if (knowledge.community === true) {
      const files = (await readdir('knowledge', { recursive: true }))
        .map((f) => `knowledge/${f}`)
        .filter((f) => f.endsWith('.md'))
        .map((id) => ({ id, access: 'community' }))

      await save_chunks(files)
    }

    //
    // Case 2 - Proprietary knowledge
    if (knowledge.proprietary === true) {
      const files = (await Bun.file(`datastores/${Bun.env.SERVICE}/__temp__/.metadata.json`).json())
        .filter((item) => item.type !== 'xlsx')
        .map((item) => ({
          access: item.access,
          id: `datastores/${Bun.env.SERVICE}/__temp__/${item.id}.md`
        }))

      await save_chunks(files)
    }

    console.log('✅ text chunks generated')
    return
  } catch (e) {
    console.log('🆘 text chunks generation failed')
    console.log(e)
  }
}

/**
 * Processes a list of files, reads their content, splits the content into
 * chunks, and saves each chunk into the appropriate database based on the
 * file's access level.
 *
 * @param files - An array of file objects to be processed. Each file object
 *                should have an `id` and `access` property. The `id` is used to
 *                read the file content, and the `access` determines which
 *                database to use.
 *
 * @returns A promise that resolves when all files have been processed.
 */
const save_chunks = async (files) => {
  try {
    // Iterate over each file
    for await (const file of files) {
      const markdown = await Bun.file(file.id).text()
      const chunks = await split_markdown_into_chunks({ markdown: markdown, max_tokens: 6800 })

      const a = 0
      // Process each chunk individually
      for (const chunk of chunks) {
        // Determine the appropriate database based on file access level
        let database: Database
        if (file.access === 'private') database = db('proprietary.private')
        else if (file.access === 'public') database = db('proprietary.public')
        else database = db('community')

        const chunk_length = count_tokens(chunk)

        // Insert the chunk into the appropriate database
        // TODO: Do I need to save chunk_stem here?
        database
          .prepare(
            'INSERT INTO chunks (chunk_hash, chunk_tokens, chunk_text, chunk_stem) VALUES (?, ?, ?, ?);'
          )
          .run(generate_hash(chunk), chunk_length, chunk, stem(chunk))

        // Store the chunk's stemmed version separately for search/indexing purposes
        database.prepare('INSERT INTO stems(chunk_stem) VALUES(?);').run(stem(chunk))
      }
    }
    return
  } catch {
    throw new Error()
  }
}

/**
 * Splits a markdown string into chunks based on headings and token limits.
 *
 * @param {Object} params - The parameters for the function.
 * @param {string} params.markdown - The markdown content to be chunked.
 * @param {number} params.max_tokens - The maximum number of tokens allowed per chunk.
 * @returns {Promise<string[]>} - A promise that resolves to an array of markdown chunks.
 *
 */
export const split_markdown_into_chunks = async ({
  markdown,
  max_tokens
}: {
  markdown: string
  max_tokens: number
}): Promise<string[]> => {
  try {
    const chunks: string[] = []
    let heading_1 = ''
    let heading_2 = ''
    let heading_3 = ''
    let heading_4 = ''
    let heading_5 = ''
    let heading_6 = ''

    const lexer = marked.lexer(markdown)

    lexer.map((item) => {
      // 1. If item is a heading, assign it to its corresponding variables
      if (item.type === 'heading' && item.depth === 1) {
        heading_1 = item.raw
        heading_2 = heading_3 = heading_4 = heading_5 = heading_6 = ''
      }
      if (item.type === 'heading' && item.depth === 2) {
        heading_2 = item.raw
        heading_3 = heading_4 = heading_5 = heading_6 = ''
      }
      if (item.type === 'heading' && item.depth === 3) {
        heading_3 = item.raw
        heading_4 = heading_5 = heading_6 = ''
      }
      if (item.type === 'heading' && item.depth === 4) {
        heading_4 = item.raw
        heading_5 = heading_6 = ''
      }
      if (item.type === 'heading' && item.depth === 5) {
        heading_5 = item.raw
        heading_6 = ''
      }
      if (item.type === 'heading' && item.depth === 6) {
        heading_6 = item.raw
      }
      // 2. Whatever item is, assign it its current heading context
      item.heading_1 = heading_1
      item.heading_2 = heading_2
      item.heading_3 = heading_3
      item.heading_4 = heading_4
      item.heading_5 = heading_5
      item.heading_6 = heading_6
    })

    let chunk = ''
    let tokens = 0

    // Iterate over augemented lexer
    for (const l of lexer) {
      const is_last = l === lexer.at(-1) // Check if this is the last item
      const next_token_count = tokens + count_tokens(l.raw)

      if (next_token_count <= max_tokens) {
        tokens = tokens + count_tokens(l.raw)
        chunk += `\n${l.raw}`
      } else {
        chunks.push(chunk)
        tokens = 0
        chunk = `${l.heading_1}\n${l.heading_2}\n${l.heading_3}\n${l.heading_4}\n${l.heading_5}\n${l.heading_6}\n${l.raw}`
      }
      if (is_last) {
        chunks.push(chunk)
      }
    }

    // Iterate over perfectly sized chunks
    const markdown_chunks: string[] = []

    for (const chunk of chunks) {
      const c = _.chain(marked.lexer(chunk))
        .uniqBy((item) => (item.type === 'heading' ? `${item.depth}-${_.trim(item.text)}` : item))
        .dropRightWhile((item) => item.type === 'heading')
        .value()

      // Rebuild a Prettier markdown file
      // and push into chunks array
      let rebuilt_chunk = c.reduce((s, t) => s + t.raw, '')
      rebuilt_chunk = await prettier.format(rebuilt_chunk, { parser: 'markdown' })
      markdown_chunks.push(rebuilt_chunk)
    }

    return markdown_chunks
  } catch {
    throw new Error()
  }
}
