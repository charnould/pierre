import type { Context } from 'hono'
import * as XLSX from 'xlsx'
import { User } from '../utils/_schema'
import { delete_all_users, save_user } from '../utils/handle-user'

/**
 * Handles the POST request to upload and process a list of users from an Excel file.
 *
 * This controller performs the following steps:
 * 1. Parses the request body to extract the uploaded file.
 * 2. Reads the Excel file and extracts the first sheet.
 * 3. Converts the sheet data into a list of user objects with properties such as email, password, role, and profiles.
 * 4. Hashes the passwords and formats the profile configurations as a JSON string.
 * 5. Deletes all existing users in the database.
 * 6. Saves the new users to the database.
 * 7. Redirects the client to the `/a/users` page upon successful completion.
 *
 * @param c - The context object containing the request and response.
 * @throws Will throw an error if any step in the process fails.
 */
export const controller = async (c: Context) => {
  try {
    const file = (await c.req.parseBody()).files as File
    const file_buffer = await file.arrayBuffer()
    const xlsx = XLSX.read(file_buffer)
    const sheet = xlsx.Sheets[xlsx.SheetNames[0]]

    const users = XLSX.utils
      .sheet_to_json<{
        email: string
        password: string
        role: string
        profil_01: string
        profil_02: string
        profil_03: string
        profil_04: string
        profil_05: string
        profil_06: string
        profil_07: string
        profil_08: string
        profil_09: string
        profil_10: string
      }>(sheet, { range: 1 })
      .map(async (item) =>
        User.parse({
          role: item.role,
          email: item.email,
          password_hash: await Bun.password.hash(item.password.trim()),
          config: JSON.stringify(
            [
              ...new Set(
                [
                  item.profil_01,
                  item.profil_02,
                  item.profil_03,
                  item.profil_04,
                  item.profil_05,
                  item.profil_06,
                  item.profil_07,
                  item.profil_08,
                  item.profil_09,
                  item.profil_10
                ]
                  .map((p) => (p ?? '').trim()) // convert null/undefined to '' and trim
                  .filter((p) => p !== '') // remove empty strings
              )
            ].sort()
          )
        })
      )

    await delete_all_users()

    for await (const user of users) await save_user(user)

    return c.redirect('/a/users')
  } catch (error) {
    console.error('An error occured while saving users:', error)
    throw error
  }
}
