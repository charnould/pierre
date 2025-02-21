import { randomUUIDv7 } from 'bun'
import { format } from 'date-fns'
import * as prettier from 'prettier'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import type { Knowledge } from './_run'

export const store_metadata = async (knowledge: Knowledge) => {
  try {
    // This function applies only to `proprietary` knowledge
    if (knowledge.proprietary === true) {
      // Load "_metadata.xlsx" spreadsheet and
      // convert it to a JSON representation
      const metadata = await Bun.file('datastores/files/_metadata.xlsx').arrayBuffer()
      const xlsx = XLSX.read(metadata)
      const sheet = xlsx.Sheets[xlsx.SheetNames[0]]

      const files = XLSX.utils
        .sheet_to_json<{
          filename: string
          access: string
          sheet: number
          headers: number
          chunk: string
          description: string
          group_by: number
          last_modified: null
        }>(sheet, { range: 2 })
        .map((item) => ({
          id: randomUUIDv7(),
          filepath: `datastores/files/${item.filename}`,
          sheet: (item.sheet || 1) - 1,
          headers: (item.headers || 1) - 1,
          access: item.access || 'private',
          description: item.description,
          last_modified: null,
          entity_column: item.group_by,
          chunk: item.chunk === 'true'
        }))

      Bun.write(
        './datastores/__temp__/.metadata.json',
        await prettier.format(JSON.stringify(Metadata.parse(files)), { parser: 'json' })
      )

      console.log('✅ Metadata saved')
      return
    }
  } catch (error) {
    console.error(error)
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
      headers: z.number(),
      sheet: z.number(),
      access: z.enum(['private', 'public']).default('private'),
      description: z.string().trim().nullable().default(null),
      last_modified: z.string().nullable().default(null),
      entity_column: z.number().nullable().default(null),
      chunk: z.boolean().default(false)
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
