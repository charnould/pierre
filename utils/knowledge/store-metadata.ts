import * as prettier from 'prettier'
import * as XLSX from 'xlsx'
import { z } from 'zod'
import { readdir } from 'node:fs/promises'
import { checksum_file, hash_filename } from './generate-hash'
import { Knowledge } from './_run'

/**
 * Processes and persists metadata for a proprietary datastore.
 *
 * High-level behavior
 * - Only runs for proprietary knowledge objects; returns immediately if knowledge.proprietary is falsy.
 * - Reads a spreadsheet _metadata.xlsx from the datastore files folder, converts it to JSON rows and
 *   maps each row to metadata records describing stored files and how they should be processed.
 * - Compares against previously persisted metadata to detect content or access changes and marks
 *   entries that require a rebuild.
 * - Expands records so that each access value becomes a separate validated Metadata record, then
 *   serializes and writes the final metadata.json file (prettified) into the datastore root.
 *
 * Error behavior
 * - Throws a human-readable error if the expected spreadsheet file (_metadata.xlsx) is missing.
 * - Rethrows any underlying errors after logging them to console.error.
 *
 * @param knowledge - The knowledge descriptor used to determine whether metadata processing applies.
 *                    Must include a boolean `proprietary` property.
 * @returns A promise that resolves when metadata has been fully processed and written to disk.
 * @throws {string} When the required _metadata.xlsx file is missing.
 * @throws {Error} When spreadsheet parsing, validation (Metadata.parse), file IO, checksum calculation,
 *                 or JSON formatting fails.
 */
export const store_metadata = async (knowledge: Knowledge) => {
  try {
    // `store_metadata` applies only to proprietary knowledge
    if (!knowledge.proprietary) return

    // STEP 1.
    // Load `_metadata.xlsx` spreadsheet and convert it to a JSON
    // representation. If file does not exist in filesystem, throw.

    const basepath = `datastores/${Bun.env.SERVICE}`

    const xlsx = Bun.file(`${basepath}/files/_metadata.xlsx`)
    const exists = await xlsx.exists()
    if (!exists) throw '❌ _metadata.xlsx is missing'

    const excel = XLSX.read(await xlsx.arrayBuffer())
    const sheet = excel.Sheets[excel.SheetNames[0]]
    const current_metadata = XLSX.utils.sheet_to_json<{
      filename: string
      access: string
      sheet: number
      headers: number
      chunk: string
      description: string
      group_by: number
    }>(sheet, { range: 2 })

    // STEP 2.
    // Load previous metadata containing notably the last known file SHA-256 hashes.
    // These hashes are used to detect which files have changed since the last run.

    const file = Bun.file(`${basepath}/metadata.json`)

    let previous_metadata: Metadata[] = []

    if (await file.exists()) {
      const f = await file.json()

      previous_metadata = Object.values(
        f.reduce((acc, item) => {
          const key = item.current_checksum
          if (!acc[key]) acc[key] = { ...item, id: undefined, access: [item.access] }
          else {
            if (!acc[key].access.includes(item.access)) acc[key].access.push(item.access)
          }
          return acc
        }, {})
      )
    } else {
      console.info('metadata.json not found: initializing empty metadata')
      Bun.write(`${basepath}/metadata.json`, JSON.stringify([]))
      previous_metadata = []
    }

    // STEP 3.
    // Build a reference table of stored files to support consistent filename matching.
    // Each entry contains:
    //   - a short hash of the normalized filename (for resilient lookups, even if Unicode differs)
    //   - the file’s current SHA-256 hash (to detect content changes)
    //   - the actual stored filename
    //
    // This will later be used to detect modified files.

    const filenames = await readdir(`${basepath}/files`)
    const file_index: { filename_hash: string; current_checksum: string; filename: string }[] = []

    await Promise.all(
      filenames.map(async (filename) => {
        const filepath = `${basepath}/files/${filename}`
        const file = Bun.file(filepath)
        const buffer = await file.arrayBuffer()

        const filename_hash = hash_filename(filename)
        const current_checksum = checksum_file(buffer)

        file_index.push({ filename_hash, current_checksum, filename })
      })
    )

    // STEP 4.
    // Map raw metadata rows into standardized file objects.
    // Each mapped entry combines:
    //   - metadata fields from `_metadata.xlsx`
    //   - lookup results from the current file index (to get the stored filename and current hash)
    //   - previous metadata (to compare old vs new file hashes and access)

    const mapped_files = current_metadata
      .map((item) => {
        const filename_hash = hash_filename(item.filename)

        const current_entry = file_index.find((d) => d.filename_hash === filename_hash)

        const previous_entry = previous_metadata.find(
          (m) => hash_filename(m.filename) === filename_hash
        )

        const filepath = current_entry
          ? `datastores/${Bun.env.SERVICE}/files/${current_entry.filename}`
          : undefined

        const access_list = item.access
          ? item.access.split(',').map((a) => a.trim().toLowerCase())
          : []

        const same_access =
          access_list.length === previous_entry?.access.length &&
          access_list.every((el) => previous_entry.access.includes(el))
        const same_checksum = previous_entry?.current_checksum === current_entry?.current_checksum
        const need_rebuild = !(same_access && same_checksum)

        return {
          access: access_list,
          filepath: filepath,
          filename: item.filename,
          chunk: item.chunk === 'true',
          entity_column: item.group_by,
          description: item.description,
          sheet: (item.sheet || 1) - 1,
          headers: (item.headers || 1) - 1,
          id: current_entry?.current_checksum,
          previous_checksum: previous_entry?.current_checksum,
          current_checksum: current_entry?.current_checksum,
          need_rebuild: need_rebuild
        }
      })
      .filter((file) => file.filepath && !file.filepath.endsWith('/undefined'))

    // STEP 5.
    // Expand each mapped file entry by its access list, then validate each resulting record with Zod.
    // In other words:
    //   - For each file that can be accessed by multiple entities
    //     (e.g. "admin, user"), create one record per access value.
    //   - Validate each expanded record using the `Metadata` schema to ensure consistency.

    const files = mapped_files.flatMap((item) =>
      item.access.filter(Boolean).map((a) => Metadata.parse({ ...item, access: a }))
    )

    // STEP 6.
    // Serialize and persist the validated metadata to disk.
    // The metadata is formatted as prettified JSON for readability.

    const metadata_path = `./datastores/${Bun.env.SERVICE}/metadata.json`
    const formatted = await prettier.format(JSON.stringify(files), { parser: 'json' })
    await Bun.write(metadata_path, formatted)

    console.log('✅ Metadata generated')

    return
  } catch (e) {
    console.error(e)
    throw e
  }
}

/**
 * Zod schema describing metadata for a knowledge/store file.
 *
 * This is a strict Zod object schema. It validates a record
 * of metadata fields and disallows unknown properties.
 *
 */
export const Metadata = z
  .object({
    id: z.string(),
    sheet: z.number(),
    headers: z.number(),
    need_rebuild: z.boolean(),
    filepath: z.string().trim(),
    filename: z.string().trim(),
    chunk: z.boolean().default(false),
    current_checksum: z.string().trim(),
    entity_column: z.number().nullable().default(null),
    description: z.string().trim().nullable().default(null),
    previous_checksum: z.string().trim().nullable().default(null),
    access: z.string().toLowerCase().trim().nullable().default(null),
    type: z.enum(['docx', 'xlsx', 'md', 'pdf']).nullable().default(null)
  })
  .strict()
  .transform((m) => {
    if (m.filepath.endsWith('.md')) m.type = 'md'
    if (m.filepath.endsWith('.pdf')) m.type = 'pdf'
    if (m.filepath.endsWith('.docx')) m.type = 'docx'
    if (m.filepath.endsWith('.xlsx')) m.type = 'xlsx'
    return m
  })

export type Metadata = z.infer<typeof Metadata>
