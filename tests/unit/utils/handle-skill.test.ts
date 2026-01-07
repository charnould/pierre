import { beforeAll, describe, expect, it } from 'bun:test'
import { SQL } from 'bun'
import { get_skill, get_skills, save_skill } from '../../../utils/handle-skill'

const sql = new SQL(`sqlite:datastores/${Bun.env.SERVICE}/datastore.sqlite`)

const s1 = {
  id: '019b988b-dc65-74c9-8116-7881c2a43ea9',
  name: 'skill 1',
  skill: 'skill 1 prompt'
}

const s2 = {
  id: '019b988b-8fec-74c4-a1a9-fe91463ab525',
  name: 'skill 2',
  skill: 'skill 2 prompt'
}

beforeAll(async () => await sql`DELETE FROM skills`)

describe('handle-skill', () => {
  it('should save a skill', async () => {
    await save_skill(s1)
    const result = await get_skill(s1.id)
    expect(result.id).toBe(s1.id)
    expect(result.name).toBe(s1.name)
    expect(result.skill).toBe(s1.skill)
  })

  it('should get a skill by id', async () => {
    await save_skill(s2)
    const result = await get_skill(s2.id)
    expect(result.name).toBe('skill 2')
    expect(result.skill).toBe('skill 2 prompt')
  })

  it('should get skills and pad with empty skills to 10 items', async () => {
    const result = await get_skills({ pad_to_length: true })
    expect(result.length).toBe(10)
    expect(result[0].name).toBe('skill 1')
  })

  it('should get skills with no padding to 10 items', async () => {
    const result = await get_skills({ pad_to_length: false })
    expect(result.length).toBe(2)
    expect(result[0].name).toBe('skill 1')
  })

  it('should update a skill on conflict', async () => {
    await save_skill(s1)
    const updated = { ...s1, name: 'updated skill 1 name', skill: 'updated skill 1 prompt' }
    await save_skill(updated)
    const result = await get_skill(s1.id)
    expect(result.name).toBe('updated skill 1 name')
    expect(result.skill).toBe('updated skill 1 prompt')
  })
})
