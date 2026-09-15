import type { Context } from 'hono'
import * as XLSX from 'xlsx'
import { z } from 'zod/v4'

import type { User } from '../../../../utils/_schema'
import { importUserPasswords } from '../../../../utils/handle-user'

const MAX_CSV_BYTES = 1024 * 1024
const Email = z.string().trim().toLowerCase().pipe(z.email())

type CsvUser = { email: string; password: string; row: number }

export const controller = async (c: Context) => {
  const form = await c.req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_CSV_BYTES) {
    return c.json(
      {
        error: {
          code: 'invalid_file',
          message: 'Sélectionnez un fichier CSV non vide de moins de 1 Mo.'
        }
      },
      400
    )
  }

  let rows: unknown[][]
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]!]
    if (!sheet) throw new Error('Missing worksheet')
    rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      raw: false
    })
  } catch {
    return c.json(
      { error: { code: 'invalid_csv', message: 'Le fichier CSV ne peut pas être lu.' } },
      400
    )
  }

  const errors: Array<{ row: number; message: string }> = []
  const users: CsvUser[] = []
  const seen = new Set<string>()
  rows.forEach((row, index) => {
    const rowNumber = index + 1
    if (!Array.isArray(row) || row.length !== 2) {
      errors.push({ row: rowNumber, message: 'Deux colonnes sont attendues.' })
      return
    }
    const email = Email.safeParse(String(row[0] ?? ''))
    const password = String(row[1] ?? '')
    if (!email.success) errors.push({ row: rowNumber, message: 'Adresse e-mail invalide.' })
    if (password.length < 8 || password.length > 128) {
      errors.push({
        row: rowNumber,
        message: 'Le mot de passe doit contenir entre 8 et 128 caractères.'
      })
    }
    if (!email.success || password.length < 8 || password.length > 128) return
    if (seen.has(email.data)) {
      errors.push({ row: rowNumber, message: 'Adresse e-mail présente plusieurs fois.' })
      return
    }
    seen.add(email.data)
    users.push({ email: email.data, password, row: rowNumber })
  })

  if (rows.length === 0) errors.push({ row: 1, message: 'Le fichier est vide.' })
  const actor = c.get('user') as User
  const ownRow = users.find(({ email }) => email === actor.email)
  if (ownRow) {
    errors.push({
      row: ownRow.row,
      message: 'Votre propre mot de passe doit être modifié depuis le formulaire.'
    })
  }
  if (errors.length > 0) {
    return c.json(
      { error: { code: 'invalid_csv', message: 'Le fichier CSV est invalide.', details: errors } },
      400
    )
  }

  const records = users.map(({ email, password }) => ({ email, password }))
  const result = await importUserPasswords(records)

  return c.json({ data: result })
}
