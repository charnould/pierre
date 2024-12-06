import type Database from 'bun:sqlite'
import { readdir } from 'node:fs/promises'
import chalk from 'chalk'
import { Document, MarkdownNodeParser } from 'llamaindex'
import ora from 'ora'
import { generate_hash } from '../../utils/knowledge/generate-hash'
import { db } from '../database'
import { stem } from '../stem-text'
import type { Args } from './_run'
import type { Metadata } from './save-metadata'

export const generate_chunks_from_md = async (args: Args) => {
  // No need for try/catch because this function should never throw

  // Start spinner
  const spinner = ora('Génération des chunks textuels').start()

  if (args['--community'] === true) {
    const files = (await readdir('knowledge', { recursive: true }))
      .map((f) => `knowledge/${f}`)
      .filter((f) => !f.startsWith('knowledge/proprietary'))
      .filter((f) => !f.startsWith('.data'))
      .filter((f) => f.endsWith('.md'))
      .map((id) => ({ id, access: 'community' }))

    await go(files)
  }

  if (args['--proprietary'] === true) {
    const files = (await Bun.file('datastores/__temp__/.metadata.json').json())
      .filter((item: Metadata[number]) => item.type !== 'xlsx')
      .map((item: Metadata[number]) => ({
        access: item.access,
        id: `datastores/__temp__/${item.id}.md`
      }))

    await go(files)
  }

  // End spinner
  spinner.succeed(chalk.green('Chunks textuels générés'))
  return
}

//
//
//
const go = async (files) => {
  for await (const file of files) {
    // Get file content
    const data = await Bun.file(file.id).text()

    // Generate chunks
    const nodes = new MarkdownNodeParser().getNodesFromDocuments([new Document({ text: data })])
    for (const node of nodes) {
      if (node.text.length > 100) {
        let chunk = ''
        chunk += node.metadata.Header_1 !== undefined ? `# ${node.metadata.Header_1}\n` : ''
        chunk += node.metadata.Header_2 !== undefined ? `## ${node.metadata.Header_2}\n` : ''
        chunk += node.metadata.Header_3 !== undefined ? `### ${node.metadata.Header_3}\n` : ''
        chunk += node.metadata.Header_4 !== undefined ? `#### ${node.metadata.Header_4}\n` : ''
        chunk += node.metadata.Header_5 !== undefined ? `##### ${node.metadata.Header_5}\n` : ''
        chunk += node.metadata.Header_6 !== undefined ? `###### ${node.metadata.Header_6}\n` : ''
        chunk += node.metadata.Header_7 !== undefined ? `####### ${node.metadata.Header_7}\n` : ''
        chunk += `${node.text}\n`

        // Use the right database
        let database: Database
        if (file.access === 'private') database = db('proprietary.private')
        else if (file.access === 'public') database = db('proprietary.public')
        else database = db('community')

        // Save chunk in the right DB
        database
          .prepare(
            `
            INSERT INTO chunks (chunk_hash, chunk_text, chunk_stem, entity_hash, entity_text)
            VALUES (?, ?, ?, ?, ?);
            `
          )
          .run(generate_hash(chunk), chunk, stem(chunk), generate_hash('none'), 'none')

        database.prepare('INSERT INTO stems(chunk_stem) VALUES(?);').run(stem(chunk))
      }
    }
  }
  return
}
