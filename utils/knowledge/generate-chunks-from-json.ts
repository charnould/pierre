import type Database from 'bun:sqlite'
import chalk from 'chalk'
import { isValid, parseISO } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { fr } from 'date-fns/locale'
import ora from 'ora'
import { generate_hash } from '../../utils/knowledge/generate-hash'
import { db } from '../database'
import { stem } from '../stem-text'
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
            .map(([key, value]) => {
              // Verify if the value is a valid date string.
              // If valid, parse and format it into a human-readable date using date-fns.
              if (typeof value === 'string' && isValid(parseISO(value))) {
                value = formatInTimeZone(value, 'Europe/Paris', 'PPPP à HH:mm', { locale: fr })
              }

              return `- ${key.toLowerCase().replace(/\s{2,}/g, ' ')} : ${value}`
            })
            .join('\n')

          if (file.description !== null) chunk = `${file.description} \n${chunk}`

          let entity_text = 'none'
          let entity_hash = 'none'
          const chunk_hash = generate_hash(chunk)

          if (file.entity_column !== null && file.entity_type !== null) {
            const keys = Object.values(j)[file.entity_column - 1]
            entity_text = `${file.entity_type}: ${keys}`
            entity_hash = generate_hash(entity_text)
          }

          database
            .prepare(
              `
              INSERT INTO chunks (chunk_hash, chunk_text, chunk_stem, entity_hash, entity_text)
              VALUES (?, ?, ?, ?, ?);
              `
            )
            .run(chunk_hash, chunk, stem(chunk), entity_hash, entity_text)

          database.prepare('INSERT INTO stems(chunk_stem) VALUES(?);').run(stem(chunk))
        }
      }
    }

    // End spinner
    spinner.succeed(chalk.green('Chunks tabulaires générés'))
    return
  }
}
