import * as fs from 'node:fs'
import { Readable } from 'node:stream'
import chalk from 'chalk'
import mammoth from 'mammoth'
import ora from 'ora'
import * as prettier from 'prettier'
import TurndownService from 'turndown'
import * as XLSX from 'xlsx'
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs'
import type { Args } from './_run'
import type { Metadata } from './save-metadata'

export const transform_office_file = async (args: Args) => {
  // No need for try/catch because this function should never throw

  // At this moment, this function applies
  // only to `proprietary` knowledge
  if (args['--proprietary'] === true) {
    // Start spinner
    const spinner = ora('Extraction des données des fichiers Office').start()

    const metadata = await Bun.file('datastores/__temp__/.metadata.json').json()

    // For each file...
    for await (const file of metadata as Metadata) {
      //
      //
      //
      //
      //
      //
      // If it's a `.docx`
      if (file.type === 'docx') {
        // Convert the input file to an HTML representation and remove any
        // images from the content (image handling is not implemented)
        const html = (await mammoth.convertToHtml({ path: file.filepath })).value.replace(
          /<img[^>]*\/>/g,
          ''
        )

        // Format the content as a clean, well-structured Markdown file (.md)
        const markdown = await prettier.format(
          new TurndownService({ headingStyle: 'atx' }).turndown(html),
          { parser: 'markdown' }
        )

        // Save the resulting Markdown file to the desired location
        await Bun.write(`./datastores/__temp__/${file.id}.md`, markdown)
      }

      //
      //
      //
      //
      //
      //
      // If it's a `.xlsx`
      if (file.type === 'xlsx') {
        // Load stuff and set variables
        XLSX.set_fs(fs)
        XLSX.set_cptable(cpexcel)
        XLSX.stream.set_readable(Readable)
        const xlsx = XLSX.read(await Bun.file(file.filepath).arrayBuffer(), { cellDates: true })

        // TODO: Determine how to handle cells with strikethrough formatting.
        //       Consider both fully strikethrough and partially strikethrough text.
        const sheet = xlsx.Sheets[xlsx.SheetNames[file.sheet]]

        // Unmerged cells
        const merges = sheet['!merges'] || []
        for (const merge of merges) {
          const startCell = XLSX.utils.encode_cell(merge.s)
          const cellValue = sheet[startCell] ? sheet[startCell].v : ''

          for (let row = merge.s.r; row <= merge.e.r; row++) {
            for (let col = merge.s.c; col <= merge.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
              sheet[cellAddress] = { t: 's', v: cellValue }
            }
          }
        }
        sheet['!merges'] = []

        // Convert data to a JSON representation while defining headline row (0-based index)
        // Format the content as a clean, well-structured JSON file (.json)
        // Save the resulting file to the desired location
        const arr = XLSX.utils.sheet_to_json(sheet, { range: file.heading_row })
        const json = await prettier.format(JSON.stringify(arr), { parser: 'json' })
        await Bun.write(`./datastores/__temp__/${file.id}.json`, json)
      }

      //
      //
      //
      //
      //
      //
      // if it's a `.md`
      if (file.type === 'md') {
        // Format the content as a clean, well-structured Markdown (.md) file
        // Save the resulting Markdown file to the desired location
        const data = await prettier.format(await Bun.file(file.filepath).text(), {
          parser: 'markdown'
        })
        await Bun.write(`./datastores/__temp__/${file.id}.md`, data)
      }
    }

    // End spinner
    spinner.succeed(chalk.green('Données extraites des fichiers Office'))
  }

  return
}
