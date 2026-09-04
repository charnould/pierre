import { describe, expect, test } from 'bun:test'

import {
  buildRepaymentAdvancementOperations,
  buildRepaymentAssignmentActivity,
  buildRepaymentEmailImportActivity,
  buildRepaymentMessageActivity,
  buildRepaymentTagChangeOperations,
  executeRepaymentAdvancementOperations,
  resolveAdvancementTenant
} from './repayment-activity-mutations'

describe('buildRepaymentMessageActivity', () => {
  test('écrit un courriel avec action, objet et corps', () => {
    const activity = buildRepaymentMessageActivity('LOC-1', 'Merci de rétablir l’APL.', 'email', {
      objet: 'Dossier APL',
      action: 'Contacter la CAF'
    })

    expect(activity?.statut).toBe('queued')
    expect(JSON.parse(activity?.contenu ?? '{}')).toEqual({
      version: 1,
      action: 'Contacter la CAF',
      objet: 'Dossier APL',
      corps: 'Merci de rétablir l’APL.'
    })
  })

  test('accepte un courriel avec objet seul si l’action est présente', () => {
    const activity = buildRepaymentMessageActivity('LOC-1', '', 'email', {
      objet: 'Dossier APL',
      action: 'Contacter la CAF'
    })

    expect(JSON.parse(activity?.contenu ?? '{}')).toEqual({
      version: 1,
      action: 'Contacter la CAF',
      objet: 'Dossier APL',
      corps: ''
    })
  })

  test('écrit un RCS avec action et corps', () => {
    const activity = buildRepaymentMessageActivity('LOC-1', 'Bonjour', 'rcs', {
      action: 'Envoyer un RCS de relance'
    })
    expect(JSON.parse(activity?.contenu ?? '{}')).toEqual({
      version: 1,
      action: 'Envoyer un RCS de relance',
      corps: 'Bonjour'
    })
  })

  test('rejette un courriel ou un RCS sans action', () => {
    expect(buildRepaymentMessageActivity('LOC-1', 'Corps', 'email', { objet: 'Objet' })).toBeNull()
    expect(buildRepaymentMessageActivity('LOC-1', 'Bonjour', 'rcs')).toBeNull()
  })

  test('rejette les notes, SMS et courriels vides', () => {
    expect(buildRepaymentMessageActivity('LOC-1', '  ', 'note')).toBeNull()
    expect(
      buildRepaymentMessageActivity('LOC-1', '  ', 'rcs', {
        action: 'Envoyer un SMS de relance'
      })
    ).toBeNull()
    expect(
      buildRepaymentMessageActivity('LOC-1', '  ', 'email', { action: 'Contacter la CAF' })
    ).toBeNull()
  })
})

describe('buildRepaymentEmailImportActivity', () => {
  test('écrit un courriel importé depuis un .eml', () => {
    const activity = buildRepaymentEmailImportActivity('LOC-1', {
      from: 'Alice <alice@bailleur.fr>',
      to: 'Bob <bob@locataire.fr>',
      subject: 'Relance loyer',
      body: 'Merci de régulariser.',
      sentAt: '2026-08-12T08:00:00Z'
    })
    expect(activity?.type).toBe('email_import')
    expect(activity?.statut).toBe('logged')
    expect(activity?.destinataire).toBe('Bob <bob@locataire.fr>')
    expect(JSON.parse(activity?.contenu ?? '{}')).toEqual({
      version: 1,
      objet: 'Relance loyer',
      corps: 'Merci de régulariser.',
      expediteur: 'Alice <alice@bailleur.fr>',
      destinataire: 'Bob <bob@locataire.fr>',
      date_envoi: '2026-08-12T08:00:00Z'
    })
  })

  test('rejette un import sans objet ni corps', () => {
    expect(
      buildRepaymentEmailImportActivity('LOC-1', {
        from: 'a@b.fr',
        to: 'c@d.fr',
        subject: '  ',
        body: '  ',
        sentAt: null
      })
    ).toBeNull()
  })
})

describe('buildRepaymentAdvancementOperations', () => {
  test('un commentaire seul ne réécrit pas bucket et action', () => {
    const operations = buildRepaymentAdvancementOperations({
      ref: 'LOC-1',
      bucket: 'amiable',
      comment: 'À suivre',
      previousBucket: 'amiable'
    })

    expect(operations.map((operation) => operation.kind)).toEqual(['note'])
  })

  test('ne produit que les changements réels', () => {
    const operations = buildRepaymentAdvancementOperations({
      ref: 'LOC-1',
      bucket: 'contentieux',
      comment: '',
      previousBucket: 'amiable'
    })

    expect(operations.map((operation) => operation.kind)).toEqual(['bucket'])
  })

  test('porte le commentaire sur le changement de phase', () => {
    const operations = buildRepaymentAdvancementOperations({
      ref: 'LOC-1',
      bucket: 'pre_contentieux',
      comment: 'Échec des relances amiables.',
      previousBucket: 'amiable'
    })

    expect(operations).toHaveLength(1)
    expect(JSON.parse(operations[0]?.activity.contenu ?? '{}')).toMatchObject({
      version: 1,
      bucket_precedent: 'amiable',
      bucket: 'pre_contentieux',
      note: 'Échec des relances amiables.'
    })
  })
})

describe('buildRepaymentTagChangeOperations', () => {
  test('écrit le snapshot et la note sur un vrai changement', () => {
    const operations = buildRepaymentTagChangeOperations({
      ref: 'LOC-1',
      tags: ['+65 ans', 'décès'],
      previousTags: ['décès'],
      comment: '  Relance avec @bob  '
    })
    expect(operations).toHaveLength(1)
    expect(operations[0]?.kind).toBe('tags')
    expect(operations[0]?.activity.recipients).toEqual(['bob'])
    expect(JSON.parse(operations[0]?.activity.contenu ?? '{}')).toEqual({
      version: 1,
      tags_precedents: ['décès'],
      tags: ['décès', '+65 ans'],
      note: 'Relance avec @bob'
    })
  })

  test('une note seule ne réécrit pas les tags', () => {
    const operations = buildRepaymentTagChangeOperations({
      ref: 'LOC-1',
      tags: ['décès'],
      previousTags: ['décès'],
      comment: 'À suivre'
    })
    expect(operations.map((operation) => operation.kind)).toEqual(['note'])
  })

  test('ignore un no-op sans note, y compris un simple réordonnancement', () => {
    expect(
      buildRepaymentTagChangeOperations({
        ref: 'LOC-1',
        tags: ['+65 ans', 'décès'],
        previousTags: ['décès', '+65 ans'],
        comment: '  '
      })
    ).toEqual([])
  })

  test('écarte les tags hors configuration du snapshot', () => {
    const operations = buildRepaymentTagChangeOperations({
      ref: 'LOC-1',
      tags: ['décès', 'inconnu'],
      previousTags: ['inconnu'],
      comment: ''
    })
    expect(JSON.parse(operations[0]?.activity.contenu ?? '{}')).toEqual({
      version: 1,
      tags_precedents: [],
      tags: ['décès']
    })
  })

  test('autorise un retrait total', () => {
    const operations = buildRepaymentTagChangeOperations({
      ref: 'LOC-1',
      tags: [],
      previousTags: ['décès'],
      comment: ''
    })
    expect(JSON.parse(operations[0]?.activity.contenu ?? '{}')).toEqual({
      version: 1,
      tags_precedents: ['décès'],
      tags: []
    })
  })
})

describe('buildRepaymentAssignmentActivity', () => {
  test('marque l’assignation manuelle du Board', () => {
    const activity = buildRepaymentAssignmentActivity(
      'LOC-1',
      { login: 'Alice', email: ' alice@bailleur.fr ' },
      'bob@bailleur.fr',
      'manual'
    )
    expect(activity?.recipients).toEqual(['alice'])
    expect(JSON.parse(activity?.contenu ?? '{}')).toEqual({
      version: 1,
      referent_precedent: 'bob@bailleur.fr',
      referent: 'alice@bailleur.fr',
      login: 'alice'
    })
  })

  test('omet origine depuis Activity', () => {
    const activity = buildRepaymentAssignmentActivity(
      'LOC-1',
      { login: 'alice', email: 'alice@bailleur.fr' },
      null
    )
    expect(JSON.parse(activity?.contenu ?? '{}')).toEqual({
      version: 1,
      referent_precedent: null,
      referent: 'alice@bailleur.fr',
      login: 'alice'
    })
  })

  test('porte le commentaire et notifie les mentions', () => {
    const activity = buildRepaymentAssignmentActivity(
      'LOC-1',
      { login: 'alice', email: 'alice@bailleur.fr' },
      null,
      'manual',
      '  Relance avec @bob  '
    )
    expect(activity?.recipients).toEqual(['alice', 'bob'])
    expect(JSON.parse(activity?.contenu ?? '{}')).toEqual({
      version: 1,
      referent_precedent: null,
      referent: 'alice@bailleur.fr',
      login: 'alice',
      note: 'Relance avec @bob'
    })
  })

  test('omet un commentaire vide', () => {
    const activity = buildRepaymentAssignmentActivity(
      'LOC-1',
      { login: 'alice', email: 'alice@bailleur.fr' },
      null,
      undefined,
      '   '
    )
    expect(JSON.parse(activity?.contenu ?? '{}')).toEqual({
      version: 1,
      referent_precedent: null,
      referent: 'alice@bailleur.fr',
      login: 'alice'
    })
  })
})

describe('resolveAdvancementTenant', () => {
  test('cible le locataire explicite même si un autre dossier est sélectionné', () => {
    const a = { id_locataire: 'LOC-A' }
    const b = { id_locataire: 'LOC-B' }
    expect(resolveAdvancementTenant([a, b], a, 'LOC-B')).toEqual({
      id_locataire: 'LOC-B',
      row: b
    })
  })

  test('retombe sur la sélection du Board sans id explicite', () => {
    const a = { id_locataire: 'LOC-A' }
    expect(resolveAdvancementTenant([a], a)).toEqual({ id_locataire: 'LOC-A', row: a })
  })

  test('retourne null sans sélection ni id', () => {
    expect(resolveAdvancementTenant([], null)).toBeNull()
  })
})

describe('executeRepaymentAdvancementOperations', () => {
  test('appelle onBucketStart puis onBucketFail si la création échoue', async () => {
    const started: string[] = []
    const failed: string[] = []
    const operations = buildRepaymentAdvancementOperations({
      ref: 'LOC-B',
      bucket: 'contentieux',
      comment: '',
      previousBucket: 'amiable'
    })
    const result = await executeRepaymentAdvancementOperations({
      operations,
      createActivity: async () => null,
      onBucketStart: () => started.push('start'),
      onBucketFail: () => failed.push('fail')
    })
    expect(result).toEqual({ allSucceeded: false, anySucceeded: false })
    expect(started).toEqual(['start'])
    expect(failed).toEqual(['fail'])
  })
})
