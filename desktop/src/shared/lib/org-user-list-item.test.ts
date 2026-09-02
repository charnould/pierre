import { describe, expect, test } from 'bun:test'

import type { OrgUser } from '@/shared/types/users'

import {
  collaboratorFacetMatchesQuery,
  collaboratorSearchLabel,
  filterCollaboratorFacetValues,
  orgUserListFields,
  orgUserListName,
  resolveOrgUserListFields
} from './org-user-list-item'

const CAMILLE: OrgUser = {
  login: 'cdubois',
  email: 'cdubois@exemple.fr',
  role: 'administrator',
  config: ['default'],
  hasAvatar: false,
  avatarBytes: 0,
  avatarVersion: 0,
  displayName: 'Camille Dubois'
}

const AMARTIN: OrgUser = {
  login: 'amartin',
  email: 'amartin@exemple.fr',
  role: 'collaborator',
  config: ['default'],
  hasAvatar: false,
  avatarBytes: 0,
  avatarVersion: 0,
  displayName: 'amartin'
}

const USERS = [CAMILLE, AMARTIN]

describe('orgUserListName', () => {
  test('prefers a custom displayName', () => {
    expect(orgUserListName(CAMILLE)).toBe('Camille Dubois')
  })

  test('falls back to login when displayName equals login', () => {
    expect(orgUserListName(AMARTIN)).toBe('amartin')
  })
})

describe('orgUserListFields', () => {
  test('L1 custom name, L2 login', () => {
    expect(orgUserListFields(CAMILLE)).toEqual({
      photoUrl: null,
      name: 'Camille Dubois',
      login: 'cdubois'
    })
  })

  test('sans nom custom, les deux lignes restent le login', () => {
    expect(orgUserListFields(AMARTIN)).toEqual({
      photoUrl: null,
      name: 'amartin',
      login: 'amartin'
    })
  })
})

describe('collaboratorSearchLabel', () => {
  test('inclut login, nom et email pour filtrer le combobox', () => {
    const label = collaboratorSearchLabel(CAMILLE)
    expect(label).toContain('cdubois')
    expect(label).toContain('Camille Dubois')
    expect(label).toContain('cdubois@exemple.fr')
  })
})

describe('resolveOrgUserListFields', () => {
  test('résout un libellé displayName de facette', () => {
    expect(resolveOrgUserListFields('Camille Dubois', USERS)).toEqual({
      photoUrl: null,
      name: 'Camille Dubois',
      login: 'cdubois'
    })
  })

  test('inconnu org : nom et login = valeur brute', () => {
    expect(resolveOrgUserListFields('ghost@exemple.fr', USERS)).toEqual({
      photoUrl: null,
      name: 'ghost@exemple.fr',
      login: 'ghost@exemple.fr'
    })
  })
})

describe('collaboratorFacetMatchesQuery', () => {
  test('matche le login d’un collab connu', () => {
    expect(collaboratorFacetMatchesQuery('Camille Dubois', 'cdub', USERS)).toBe(true)
  })

  test('matche le nom', () => {
    expect(collaboratorFacetMatchesQuery('Camille Dubois', 'camille', USERS)).toBe(true)
  })

  test('ignore la casse', () => {
    expect(collaboratorFacetMatchesQuery('Camille Dubois', 'CAMILLE', USERS)).toBe(true)
  })

  test('ne matche pas un autre collab', () => {
    expect(collaboratorFacetMatchesQuery('Camille Dubois', 'amartin', USERS)).toBe(false)
  })
})

describe('filterCollaboratorFacetValues', () => {
  const values = ['Camille Dubois', 'amartin', 'ghost@exemple.fr']

  test('filtre par login', () => {
    expect(filterCollaboratorFacetValues(values, 'cdubois', USERS)).toEqual(['Camille Dubois'])
  })

  test('sans query, conserve l’ordre', () => {
    expect(filterCollaboratorFacetValues(values, '  ', USERS)).toEqual(values)
  })
})
