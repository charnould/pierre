import type Database from 'bun:sqlite'
import chalk from 'chalk'
import ora from 'ora'
import { db } from '../database'
import type { Args } from './_run'
import type { Metadata } from './save-metadata'

export const generate_chunks_from_json = async (args: Args) => {
  // No need for try/catch because this function should never throw

  // At this moment, this function applies
  // only to `proprietary` knowledge
  if (args['--proprietary'] === true) {
    // Start spinner
    const spinner = ora('Génération des chunks tabulaires').start()

    const metadata = await Bun.file('datastores/__temp__/.metadata.json').json()

    for await (const file of metadata as Metadata) {
      if (file.type === 'xlsx') {
        const json = await Bun.file(`datastores/__temp__/${file.id}.json`).json()

        // Use the right database
        let database: Database
        if (file.access === 'private') database = db('proprietary.private')
        else database = db('proprietary.public')

        // Generate and save chunks in the right DB
        for (const j of json) {
          let chunk = Object.entries(j)
            .map(([key, value]) => `- ${key.toLowerCase().replace(/\s{2,}/g, ' ')} : ${value}`)
            .join('\n')

          if (file.description !== null) chunk = `${file.description} \n${chunk}`

          database.prepare('INSERT INTO chunks(chunk) VALUES(?);').run(chunk)
        }
      }
    }

    // End spinner
    spinner.succeed(chalk.green('Chunks tabulaires générés'))
    return
  }
}
