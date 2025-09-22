import { readdir } from 'node:fs/promises'
import _ from 'lodash'
import { marked } from 'marked'
import * as prettier from 'prettier'
import { stem } from '../stem-text'
import type { Knowledge } from './_run'
import { count_tokens } from './chunk-json'
import { generate_hash } from './generate-hash'
import { SQL } from 'bun'
import { Metadata } from './store-metadata'

/**
 * Generates text chunks from markdown files
 * based on the provided knowledge object.
 */
export const chunk_markdown = async (knowledge: Knowledge) => {
  let files: { id: string; filename: string; access: string }[] = []

  // Community knowledge
  if (knowledge.community) {
    const all_files = await readdir('knowledge', { recursive: true })
    const md_files = all_files.filter((file) => file.endsWith('.md'))
    files.push(
      ...md_files.map((file) => ({
        id: `knowledge/${file}`,
        access: 'community',
        filename: file
      }))
    )
  }

  // Proprietary knowledge
  if (knowledge.proprietary) {
    const metadata_path = `datastores/${Bun.env.SERVICE}/temp/.metadata.json`
    const metadata: Metadata[] = await Bun.file(metadata_path).json()
    const valid_metadata = metadata.filter((item) => item.type !== 'xlsx')
    files.push(
      ...valid_metadata.map((file) => ({
        id: `datastores/${Bun.env.SERVICE}/temp/${file.id}.md`,
        filename: file.filename,
        access: file.access as string
      }))
    )
  }

  if (files.length === 0) {
    console.log('❌ No file to chunk')
    return
  }

  try {
    for (const file of files) await chunk_and_save(file)
    console.log('✅ Text chunks generated')
  } catch (e) {
    console.error('❌ Text chunks generation failed')
    throw e
  }
}

/**
 * Processes a list of files, reads their content, splits the content into
 * chunks, and saves each chunk into the appropriate database based on the
 * file's access level.
 */
const chunk_and_save = async (file: { id: string; filename: string; access: string }) => {
  // Attempt to load the file from the filesystem.
  // If the file doesn't exist, log an error and stop processing this file.
  const file_handle = Bun.file(file.id)
  const file_exists = await file_handle.exists()
  if (!file_exists) {
    console.error(`❌ File not found: ${file.id}`)
    return
  }

  try {
    // Read the file content and split it into chunks for processing.
    const markdown_content = await file_handle.text()
    const markdown_chunks = await split_markdown_into_chunks(markdown_content)

    // Select the target database according
    // to its access level
    let sql
    if (file.access === 'community') sql = new SQL(`file:knowledge/data.sqlite`)
    else sql = new SQL(`file:datastores/${Bun.env.SERVICE}/proprietary.sqlite`)

    // Process each chunk by storing the chunk together
    // with its hash, tokens, text, and access metadata
    for (const chunk of markdown_chunks) {
      await sql`
        INSERT INTO
          chunks ${sql({
          chunk_tokens: count_tokens(chunk),
          chunk_hash: generate_hash(chunk),
          chunk_access: file.access,
          chunk_file: file.filename,
          chunk_text: chunk
        })};
      `
      await sql`
        INSERT INTO
          stems (chunk_stem)
        VALUES
          (${stem(chunk)});
      `
    }
  } catch (e) {
    console.error(e)
  }
}

/**
 * Splits a markdown string into chunks based on headings and token limits.
 */
export const split_markdown_into_chunks = async (markdown: string): Promise<string[]> => {
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

      if (next_token_count <= 7200) {
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
      rebuilt_chunk = await prettier.format(rebuilt_chunk, {
        parser: 'markdown'
      })
      markdown_chunks.push(rebuilt_chunk)
    }

    return markdown_chunks
  } catch {
    throw new Error()
  }
}
