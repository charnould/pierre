import type Database from 'bun:sqlite'
import { openai } from '@ai-sdk/openai'
import { embedMany } from 'ai'
import chalk from 'chalk'
import _ from 'lodash'
import ora from 'ora'
import { z } from 'zod'
import { db } from '../database'
import type { Args } from './_run'

export const generate_embeddings = async (args: Args) => {
  // Start spinner
  const spinner = ora(`Génération des embeddings ${chalk.dim('(5 min.)')}`).start()

  try {
    // Generate and save `community` embeddings
    if (args['--community'] === true) {
      const database = db('community')
      const query = database.query('SELECT rowid, * FROM chunks ORDER BY rowid;').all() as Chunk[]
      await go(query, database)
    }

    // Generate and save `proprietary.private/public` embeddings
    if (args['--proprietary'] === true) {
      let database: Database
      let query: Chunk[]

      // Handle `proprietary.private`
      database = db('proprietary.private')
      query = database.query('SELECT rowid, * FROM chunks ORDER BY rowid;').all() as Chunk[]
      await go(query, database)

      // Handle `proprietary.public`
      database = db('proprietary.public')
      query = database.query('SELECT rowid, * FROM chunks ORDER BY rowid;').all() as Chunk[]
      await go(query, database)
    }
  } catch (e) {
    // Show failed spinner
    spinner.fail(chalk.red.bold('Embeddings generation failed'))
    console.log(e)
    return
  }

  // End spinner and return
  spinner.succeed(chalk.green('Embeddings générés'))
  return
}

//
//
//
//
// This function does the main job:
// (1) generate embeddings
// (2) save them in DB
const go = async (query: Chunk[], database: Database) => {
  for await (const group of _.chunk(query, 100)) {
    const chunks = group.map((item) => item.chunk)

    const { embeddings } = await embedMany({
      model: openai.embedding('text-embedding-3-large'),
      values: chunks
    })

    const vectors = group.map((item, index) => ({
      rowid: item.rowid,
      vector: embeddings[index]
    }))

    for (const v of vectors) {
      database
        .prepare('INSERT INTO vectors(rowid, vector) VALUES (?, vec_f32(?))')
        .run(v.rowid, new Float32Array(v.vector))
    }
  }
  return
}

//
//
//
//
// Zod schema/TS type
export const Chunk = z.object({
  rowid: z.number(),
  chunk: z.string()
})

export type Chunk = z.infer<typeof Chunk>
