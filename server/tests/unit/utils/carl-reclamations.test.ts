import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { FIELDS, type Mention } from '../../../utils/carl'
import { CarlReclamationsError, qualifyReclamations } from '../../../utils/carl-reclamations'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'

const paths = testDatastorePaths('carl_reclamations')

const mention = {
  domaine: 'technique',
  sous_domaine: 'chauffage',
  motif: 'panne',
  integrite_physique: 'intacte',
  lieu: 'logement',
  obligation_reglementaire: 'bailleur',
  ton: 'neutre'
} satisfies Mention

const payload = {
  columns: ['id_reclamation', 'message', 'canal', ...FIELDS],
  rows: [
    {
      id_reclamation: 'a',
      message: null,
      canal: 'appel',
      domaine: 'faux',
      sous_domaine: 'faux',
      motif: 'faux',
      integrite_physique: 'faux',
      lieu: 'faux',
      obligation_reglementaire: 'faux',
      ton: 'faux'
    },
    { id_reclamation: ' b ', message: '', canal: 'mail' },
    { id_reclamation: 12, message: '   ', canal: 'agence' }
  ]
}

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(paths.root, { recursive: true })
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
})

describe('qualifyReclamations', () => {
  it('classifies every message once, including empty text, and keeps that result', async () => {
    const seen: string[] = []
    const classify = async (text: string) => {
      seen.push(text)
      return mention
    }

    const first = await qualifyReclamations(payload, classify)
    expect(seen).toEqual(['', '', '   '])
    expect(first.columns).toEqual(['id_reclamation', 'message', 'canal', ...FIELDS])
    expect(first.rows[0]).toMatchObject(mention)
    expect(first.rows.map((row) => row['domaine'])).toEqual(['technique', 'technique', 'technique'])
    expect(first.rows[0]?.['id_reclamation']).toBe('a')

    seen.length = 0
    const second = await qualifyReclamations(
      {
        columns: payload.columns,
        rows: [{ id_reclamation: 'a', message: 'texte corrigé', motif: 'ancien' }]
      },
      async () => {
        seen.push('unexpected')
        return { ...mention, domaine: 'administratif' }
      }
    )
    expect(seen).toEqual([])
    expect(second.rows[0]).toMatchObject(mention)
  })

  it('drops rows without an identifier before classification', async () => {
    const seen: string[] = []
    const result = await qualifyReclamations(
      {
        columns: ['id_reclamation', 'message'],
        rows: [
          { id_reclamation: ' ', message: 'vide' },
          { id_reclamation: null, message: 'nul' },
          { id_reclamation: 'a', message: 'fuite' }
        ]
      },
      async (text) => {
        seen.push(text)
        return mention
      }
    )
    expect(seen).toEqual(['fuite'])
    expect(result.rows.map((row) => row['id_reclamation'])).toEqual(['a'])
  })

  it('rejects an invalid file before writing the cache', async () => {
    const classify = async () => mention
    await expect(
      qualifyReclamations({ columns: ['id_reclamation'], rows: [] }, classify)
    ).rejects.toThrow(new CarlReclamationsError('La colonne message est absente.'))
    await expect(
      qualifyReclamations(
        {
          columns: ['id_reclamation', 'message'],
          rows: [
            { id_reclamation: 'a', message: 'x' },
            { id_reclamation: ' a ', message: 'y' }
          ]
        },
        classify
      )
    ).rejects.toThrow(new CarlReclamationsError('Identifiant de réclamation en double : a'))
    expect(await Bun.file(paths.database).exists()).toBe(false)
  })

  it('keeps committed batches when classification fails and resumes the rest', async () => {
    const rows = Array.from({ length: 101 }, (_, index) => ({
      id_reclamation: `id-${index}`,
      message: `message-${index}`
    }))
    let calls = 0
    await expect(
      qualifyReclamations({ columns: ['id_reclamation', 'message'], rows }, async () => {
        calls += 1
        if (calls === 101) throw new Error('panne')
        return mention
      })
    ).rejects.toThrow('panne')

    const db = new Database(paths.database, { readonly: true })
    const cached = db
      .query<{ n: number }, []>('SELECT COUNT(*) AS n FROM carl_qualifications')
      .get()
    db.close()
    expect(cached?.n).toBe(100)

    const resumed: string[] = []
    await qualifyReclamations({ columns: ['id_reclamation', 'message'], rows }, async (text) => {
      resumed.push(text)
      return mention
    })
    expect(resumed).toEqual(['message-100'])
  })
})
