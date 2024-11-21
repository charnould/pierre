import { randomUUIDv7 } from 'bun'
import chalk from 'chalk'
import { format } from 'date-fns'
import ora from 'ora'
import * as prettier from 'prettier'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import type { Args } from './_run'

export const get_and_save_metadata = async (args: Args) => {
  // No need for try/catch because this function should never throw

  // At this moment, this function applies
  // only to `proprietary` knowledge
  if (args['--proprietary'] === true) {
    // Start spinner
    const spinner = ora('Obtention des métadonnées').start()

    // Load "_metadata.xlsx" spreadsheet and
    // convert it to a JSON representation
    const metadata = await Bun.file('knowledge/proprietary/_metadata.xlsx').arrayBuffer()
    const xlsx = XLSX.read(metadata)
    const sheet = xlsx.Sheets[xlsx.SheetNames[0]]

    const files = XLSX.utils
      .sheet_to_json<{
        "Chemin d'accès": string
        Onglet: number
        "Ligne d'en-tête": number
        Accès: string
        Description: string
        last_modified: null
      }>(sheet, { range: 1 })
      .map((item) => ({
        id: randomUUIDv7(),
        filepath: `knowledge/proprietary/${item["Chemin d'accès"]}`,
        sheet: (item.Onglet || 1) - 1,
        heading_row: (item["Ligne d'en-tête"] || 1) - 1,
        access: item.Accès || 'private',
        description: item.Description || null,
        last_modified: null
      }))

    Bun.write(
      './datastores/__temp__/.metadata.json',
      await prettier.format(JSON.stringify(Metadata.parse(files)), { parser: 'json' })
    )

    // End spinner
    spinner.succeed(chalk.green('Métadonnées obtenues'))
    return
  }
}

//
//
//
//
// Metadata Zod shema
export const Metadata = z.array(
  z
    .object({
      id: z.string(),
      filepath: z.string().trim(),
      type: z.enum(['docx', 'xlsx', 'md']).nullable().default(null),
      heading_row: z.number(),
      sheet: z.number(),
      access: z.enum(['private', 'public']).default('private'),
      description: z.string().trim().nullable().default(null),
      last_modified: z.string().nullable().default(null)
    })
    .strict()
    .transform((m) => {
      if (m.filepath.endsWith('.md')) m.type = 'md'
      if (m.filepath.endsWith('.docx')) m.type = 'docx'
      if (m.filepath.endsWith('.xlsx')) m.type = 'xlsx'
      if (m.last_modified === null) m.last_modified = format(new Date(), "yyyy-MM-dd'T'HH:mm:ssXXX")
      return m
    })
)

export type Metadata = z.infer<typeof Metadata>
