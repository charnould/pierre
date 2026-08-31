import { expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { Activite } from '@/shared/types/activites'

import { RepaymentTagsChangeBody, RepaymentTagsChangeSentence } from './RepaymentTagsChangeBody'

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

test('rend le snapshot de tags en une phrase', () => {
  const html = renderToStaticMarkup(
    <RepaymentTagsChangeSentence
      row={activity({
        type: 'repayment_tag_change',
        contenu: JSON.stringify({
          version: 1,
          tags_precedents: [],
          tags: ['décès', '+65 ans']
        })
      })}
    />
  )

  expect(html).toContain('a mis à jour les tags')
  expect(html).toContain('décès')
  expect(html).toContain('+65 ans')
  expect(html).not.toContain('→')
})

test('rend un retrait total sans chips', () => {
  const html = renderToStaticMarkup(
    <RepaymentTagsChangeSentence
      row={activity({
        type: 'repayment_tag_change',
        contenu: JSON.stringify({
          version: 1,
          tags_precedents: ['décès'],
          tags: []
        })
      })}
    />
  )

  expect(html).toContain('a mis à jour les tags')
  expect(html).toContain('Aucun tag')
})

test('n’affiche pas un tag hors configuration', () => {
  const html = renderToStaticMarkup(
    <RepaymentTagsChangeSentence
      row={activity({
        type: 'repayment_tag_change',
        contenu: JSON.stringify({
          version: 1,
          tags_precedents: [],
          tags: ['décès', 'inconnu']
        })
      })}
    />
  )

  expect(html).toContain('décès')
  expect(html).not.toContain('inconnu')
})

test('un snapshot hors config se lit comme aucun tag', () => {
  const html = renderToStaticMarkup(
    <RepaymentTagsChangeSentence
      row={activity({
        type: 'repayment_tag_change',
        contenu: JSON.stringify({
          version: 1,
          tags_precedents: [],
          tags: ['inconnu']
        })
      })}
    />
  )

  expect(html).toContain('Aucun tag')
  expect(html).not.toContain('inconnu')
})

test('le corps n’affiche que la note', () => {
  expect(
    renderToStaticMarkup(
      <RepaymentTagsChangeBody
        row={activity({
          type: 'repayment_tag_change',
          contenu: JSON.stringify({
            version: 1,
            tags_precedents: [],
            tags: ['décès'],
            note: 'Dossier prioritaire.'
          })
        })}
      />
    )
  ).toContain('Dossier prioritaire.')

  expect(
    renderToStaticMarkup(
      <RepaymentTagsChangeBody
        row={activity({
          type: 'repayment_tag_change',
          contenu: JSON.stringify({
            version: 1,
            tags_precedents: [],
            tags: ['décès']
          })
        })}
      />
    )
  ).toBe('')
})
