import { expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { Activite } from '@/shared/types/activites'

import {
  RepaymentStatusChangeBody,
  RepaymentStatusChangeSentence
} from './RepaymentStatusChangeBody'

function activity(overrides: Partial<Activite>): Activite {
  return {
    id: 1,
    date_creation: '2026-08-22T10:00:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:gregoire@example.org',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu: '{}',
    ...overrides
  }
}

test('rend une affectation en une phrase', () => {
  const html = renderToStaticMarkup(
    <RepaymentStatusChangeSentence
      row={activity({
        type: 'repayment_assignment',
        contenu: JSON.stringify({
          version: 1,
          gestionnaire_precedent: null,
          gestionnaire: 'abraconnier@example.org',
          login: 'abraconnier'
        })
      })}
    />
  )

  expect(html).toContain('a affecté le dossier à')
  expect(html).toContain('Abraconnier')
  expect(html).not.toContain('→')
})

test('rend une réaffectation en une phrase', () => {
  const html = renderToStaticMarkup(
    <RepaymentStatusChangeSentence
      row={activity({
        type: 'repayment_assignment',
        contenu: JSON.stringify({
          version: 1,
          gestionnaire_precedent: 'abraconnier@example.org',
          gestionnaire: 'avwoillard@example.org',
          login: 'avwoillard'
        })
      })}
    />
  )

  expect(html).toContain('a réaffecté le dossier de')
  expect(html).toContain('Abraconnier')
  expect(html).toContain('Avwoillard')
  expect(html).not.toContain('→')
})

test('rend un changement de groupe en une phrase', () => {
  const html = renderToStaticMarkup(
    <RepaymentStatusChangeSentence
      row={activity({
        type: 'repayment_phase_change',
        contenu: JSON.stringify({
          version: 1,
          phase_precedente: 'amiable',
          phase: 'pre_contentieux'
        })
      })}
    />
  )

  expect(html).toContain('a déplacé le dossier du groupe')
  expect(html).toContain('Recouvrement amiable')
  expect(html).toContain('Précontentieux')
  expect(html).toContain('vers')
  expect(html).not.toContain('→')
})

test('affiche le commentaire sous un changement de groupe', () => {
  const html = renderToStaticMarkup(
    <RepaymentStatusChangeBody
      row={activity({
        type: 'repayment_phase_change',
        contenu: JSON.stringify({
          version: 1,
          phase_precedente: 'amiable',
          phase: 'pre_contentieux',
          note: 'Échec des relances. @bob à confirmer.'
        })
      })}
    />
  )

  expect(html).toContain('Échec des relances.')
  expect(html).toContain('Bob')
  expect(html).not.toContain('→')
})

test('affiche le commentaire sous une affectation', () => {
  const html = renderToStaticMarkup(
    <RepaymentStatusChangeBody
      row={activity({
        type: 'repayment_assignment',
        contenu: JSON.stringify({
          version: 1,
          gestionnaire_precedent: null,
          gestionnaire: 'abraconnier@example.org',
          login: 'abraconnier',
          note: 'À relancer avec @bob.'
        })
      })}
    />
  )

  expect(html).toContain('À relancer avec')
  expect(html).toContain('Bob')
  expect(html).not.toContain('→')
})

test('n’affiche pas de corps sans commentaire ni pour une affectation', () => {
  expect(
    renderToStaticMarkup(
      <RepaymentStatusChangeBody
        row={activity({
          type: 'repayment_phase_change',
          contenu: JSON.stringify({
            version: 1,
            phase_precedente: 'amiable',
            phase: 'pre_contentieux'
          })
        })}
      />
    )
  ).toBe('')

  expect(
    renderToStaticMarkup(
      <RepaymentStatusChangeBody
        row={activity({
          type: 'repayment_assignment',
          contenu: JSON.stringify({
            version: 1,
            gestionnaire_precedent: null,
            gestionnaire: 'alice@example.org'
          })
        })}
      />
    )
  ).toBe('')
})
