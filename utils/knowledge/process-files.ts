import * as fs from 'node:fs'
import { Readable } from 'node:stream'
import { fr } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import _ from 'lodash'
import mammoth from 'mammoth'
import * as prettier from 'prettier'
import TurndownService from 'turndown'
import * as XLSX from 'xlsx'
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs'
import type { Knowledge } from './_run'
import type { Metadata } from './store-metadata'
import { convert_pdf_to_markdown } from './convert-pdf-to-markdown'

export const process_files = async (knowledge: Knowledge) => {
  // Only process proprietary knowledge; skip all other types
  if (!knowledge.proprietary) return

  const metadata: Metadata[] = await Bun.file(`datastores/${Bun.env.SERVICE}/metadata.json`).json()

  for await (const file of metadata as Metadata[]) {
    // Skip processing if the file is missing on disk
    // (move to the next iteration of the loop)
    const exists = await Bun.file(file.filepath).exists()
    if (!exists) {
      console.info(`${file.filename} is missing on disk`)
      continue
    }

    // Skip processing if the file DOES NOT need rebuild
    // (need_rebuild = false)
    if (!file.need_rebuild) continue

    ////////////////////////
    // MD FILE PROCESSING
    ////////////////////////
    if (file.type === 'md') {
      const raw = await Bun.file(file.filepath).text()
      const markdown = await prettier.format(raw, { parser: 'markdown' })
      await Bun.write(`./datastores/${Bun.env.SERVICE}/temp/${file.id}.md`, markdown)
    }

    ////////////////////////
    // PDF FILE PROCESSING
    ////////////////////////
    if (file.type === 'pdf') {
      try {
        const raw_data = await convert_pdf_to_markdown(file.filepath)
        if (!raw_data) continue
        const markdown = await prettier.format(raw_data, { parser: 'markdown' })
        await Bun.write(`./datastores/${Bun.env.SERVICE}/temp/${file.id}.md`, markdown)
      } catch (e) {
        console.error(`Unexpected error while processing ${file.filepath}:`, e)
      }
    }

    ////////////////////////
    // DOCX FILE PROCESSING
    ////////////////////////
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
      await Bun.write(`./datastores/${Bun.env.SERVICE}/temp/${file.id}.md`, markdown)
    }

    ////////////////////////
    // XLSX FILE PROCESSING
    ////////////////////////
    if (file.type === 'xlsx') {
      // Load stuff and set variables
      XLSX.set_fs(fs)
      XLSX.set_cptable(cpexcel)
      XLSX.stream.set_readable(Readable)
      const xlsx = XLSX.read(await Bun.file(file.filepath).arrayBuffer(), {
        cellDates: true
      })

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

      // Convert data to a JSON representation while defining headline row.
      let arr = XLSX.utils.sheet_to_json(sheet, { range: file.headers })

      // Iterate over the array to:
      // - Transform each value to lowercase
      // - Transform date in a readable french
      // - Remove extra spaces and \n (?)
      arr = _.chain(arr)
        .map((obj) =>
          Object.fromEntries(
            Object.entries(obj).map(([key, value]) => {
              // Convert keys to lowercase and trim
              const lowercaseKey = key.toLowerCase().trim()

              // Check if the value is a Date object
              if (value instanceof Date) {
                // Format the date in the 'Europe/Paris' timezone
                return [
                  lowercaseKey,
                  formatInTimeZone(value, 'Europe/Paris', 'PPPP', {
                    locale: fr
                  })
                ]
              }

              // For non-date values
              if (typeof value === 'string') {
                // Trim, replace newlines and multiple spaces with single space, and convert to lowercase
                return [
                  lowercaseKey,
                  value.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ').toLowerCase()
                ]
              }

              // For non-string non-date values
              return [lowercaseKey, value]
            })
          )
        )
        .groupBy((obj) => {
          const keys = Object.keys(obj) // Get the keys of the first transformed object
          if (file.entity_column !== null) return obj[keys[file.entity_column - 1]]
        })
        .value()

      // Format the content as a clean, well-structured JSON file (.json).
      // Save the resulting file to the desired location.
      const json = await prettier.format(JSON.stringify(arr), { parser: 'json' })
      await Bun.write(`./datastores/${Bun.env.SERVICE}/temp/${file.id}.json`, json)
    }
  }

  console.log('✅ Files processed')

  return
}
