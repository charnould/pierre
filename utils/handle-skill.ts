import { SQL } from 'bun'
import { Skill } from './_schema'

const sql = new SQL(`sqlite:datastores/${Bun.env.SERVICE}/datastore.sqlite`)

/**
 * Retrieves a skill record by its ID from the database.
 *
 * @param id - The unique identifier of the skill to retrieve
 * @returns A promise that resolves to the skill object
 * @throws {Error} If no skill with the given ID is found
 *
 * This function is tested.
 *
 */
export const get_skill = async (id: string) => {
  const records = await sql`
    SELECT
      *
    FROM
      skills
    WHERE
      id = ${id}
  `

  if (!records[0]) throw new Error('Skill not found')
  return records[0] as Skill
}

/**
 * Retrieves skills from the database with optional padding.
 *
 * @param option - Configuration options for skill retrieval
 * @param option.pad_to_length - If true, pads the result array to a minimum length of 10 with empty skill objects
 * @returns A promise that resolves to an array of skills
 *
 * This function is tested.
 *
 */
export const get_skills = async (option: { pad_to_length: boolean }): Promise<Skill[]> => {
  const records = await sql`
    SELECT
      *
    FROM
      skills
    ORDER BY
      name IS NULL,
      name ASC
  `

  const result = [...records]

  if (option.pad_to_length) {
    while (result.length < 10) {
      result.push({
        id: Bun.randomUUIDv7(),
        name: null,
        skill: null
      })
    }
  }

  return result as Skill[]
}

/**
 * Saves a skill to the database, inserting a new record or updating an existing one.
 *
 * @param skill - The skill object containing id, name, and skill properties to be saved
 * @returns A promise that resolves when the skill has been successfully saved
 * @throws If there is a database error during the insert or update operation
 *
 * This function is tested.
 *
 */
export const save_skill = async (skill: Skill): Promise<void> => {
  return await sql`
    INSERT INTO
      skills (id, name, skill)
    VALUES
      (
        ${skill.id},
        ${skill.name},
        ${skill.skill}
      ) ON CONFLICT (id) DO
    UPDATE
    SET
      name = excluded.name,
      skill = excluded.skill
  `
}
