import { randomUUIDv7 } from 'bun'
import { format } from 'date-fns'
import * as prettier from 'prettier'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import { encode_filename } from '../../utils/knowledge/generate-hash'

export const store_metadata = async () => {
  try {
    // Load "_metadata.xlsx" spreadsheet and
    // convert it to a JSON representation
    const metadata = Bun.file(
      `datastores/${Bun.env.SERVICE}/files/${encode_filename('_metadata.xlsx')}`
    )

    // If file does not exist in filesystem
    // skips the rest of the current loop iteration and moves to the next item.
    const exists = await metadata.exists()
    if (!exists) throw '❌ _metadata.xlsx is missing'

    const xlsx = XLSX.read(await metadata.arrayBuffer())
    const sheet = xlsx.Sheets[xlsx.SheetNames[0]]

    // 1️⃣ Convert sheet to raw JSON
    const rawFiles = XLSX.utils.sheet_to_json<{
      filename: string
      access: string
      sheet: number
      headers: number
      chunk: string
      description: string
      group_by: number
      last_modified: null
    }>(sheet, { range: 2 })

    // 2️⃣ Map raw rows into standardized objects
    const mappedFiles = rawFiles.map((item) => ({
      filepath: `datastores/${Bun.env.SERVICE}/files/${encode_filename(item.filename)}`,
      access: item.access?.split(',').map((p) => p.trim().toLowerCase()) ?? [],
      headers: (item.headers || 1) - 1,
      sheet: (item.sheet || 1) - 1,
      description: item.description,
      entity_column: item.group_by,
      chunk: item.chunk === 'true',
      filename: item.filename,
      last_modified: null,
      id: randomUUIDv7()
    }))

    // 3️⃣ Explode items by access and parse each with Zod
    const files = mappedFiles.flatMap((item) =>
      item.access.filter(Boolean).map((a) => Metadata.parse({ ...item, access: a }))
    )

    // 4️⃣ Write formatted JSON to disk
    const metadata_path = `./datastores/${Bun.env.SERVICE}/temp/.metadata.json`
    const formatted = await prettier.format(JSON.stringify(files), { parser: 'json' })
    await Bun.write(metadata_path, formatted)

    console.log('✅ Metadata generated')

    return
  } catch (e) {
    console.log('❌ Metadata generation failed')
    console.error(e)
  }
}

//
//
//
//
// Metadata Zod shema
export const Metadata = z
  .object({
    id: z.string(),
    filename: z.string().trim(),
    filepath: z.string().trim(),
    type: z.enum(['docx', 'xlsx', 'md']).nullable().default(null),
    headers: z.number(),
    sheet: z.number(),
    access: z.string().toLowerCase().trim().nullable().default(null),
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

export type Metadata = z.infer<typeof Metadata>
