import { expect, mock, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { Activite } from '@/shared/types/activites'

import { RepaymentTodoEventBody } from './RepaymentTodoEventBody'

const completed: Activite = {
  id: 2,
  date_creation: '2026-08-23T14:00:00Z',
  rattachement: 'repayment:LOC-1',
  auteur: 'user:bob@example.org',
  id_client: 'CLI-1',
  id_locataire: 'LOC-1',
  id_lot: null,
  type: 'action',
  statut: 'logged',
  mentions: [],
  thread_id: 'todo-1',
  event: 'completed',
  state: 'fait',
  revision: 2,
  contenu: JSON.stringify({
    version: 1,
    action: 'Appeler le locataire',
    etat: 'fait',
    assigne_a: 'user:alice@example.org',
    date_echeance: '2026-08-28',
    cree_par: 'user:charles@example.org',
    cree_le: '2026-08-22T10:00:00Z',
    resultat: 'Promesse confirmée.'
  })
}

test('affiche un événement de tâche en lecture seule', () => {
  const markup = renderToStaticMarkup(<RepaymentTodoEventBody row={completed} />)

  expect(markup).toContain('Promesse confirmée.')
  expect(markup).not.toContain('Rouvrir la tâche')
  expect(markup).not.toContain('type="checkbox"')
  expect(markup).not.toContain('Replanifier')
})

test('affiche le commentaire d’une tâche réalisée sans résultat', () => {
  const row: Activite = {
    ...completed,
    contenu: JSON.stringify({
      ...JSON.parse(completed.contenu),
      note: 'Relancer si pas de retour.',
      resultat: undefined
    })
  }
  const markup = renderToStaticMarkup(<RepaymentTodoEventBody row={row} />)

  expect(markup).toContain('Relancer si pas de retour.')
  expect(markup).not.toContain('Promesse confirmée.')
})

test('affiche commentaire et résultat d’une tâche réalisée, sans doublon', () => {
  const row: Activite = {
    ...completed,
    contenu: JSON.stringify({
      ...JSON.parse(completed.contenu),
      note: 'Relancer si pas de retour.',
      resultat: 'Promesse confirmée.'
    })
  }
  expect(renderToStaticMarkup(<RepaymentTodoEventBody row={row} />)).toContain(
    'Relancer si pas de retour.'
  )
  expect(renderToStaticMarkup(<RepaymentTodoEventBody row={row} />)).toContain(
    'Promesse confirmée.'
  )

  const duplicate: Activite = {
    ...completed,
    contenu: JSON.stringify({
      ...JSON.parse(completed.contenu),
      note: 'Promesse confirmée.',
      resultat: 'Promesse confirmée.'
    })
  }
  const duplicateMarkup = renderToStaticMarkup(<RepaymentTodoEventBody row={duplicate} />)
  expect(duplicateMarkup.split('Promesse confirmée.').length - 1).toBe(1)
})

test('propose de rouvrir uniquement si l’événement réalisé est courant', () => {
  const onReopen = mock(() => {})
  const markup = renderToStaticMarkup(
    <RepaymentTodoEventBody row={completed} current onReopen={onReopen} />
  )

  expect(markup).toContain('Rouvrir la tâche')
})
