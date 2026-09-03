import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import type { UserPrincipal } from '@/shared/types/users'

import { AdministrationView } from './AdministrationView'

const user: UserPrincipal = {
  email: 'admin@example.org',
  isAdministrator: true,
  moduleIds: ['tickets'],
  chatbotIds: ['default']
}

describe('AdministrationView', () => {
  test('exposes the five requested sections and starts on users', () => {
    const html = renderToStaticMarkup(
      <AdministrationView
        hidden={false}
        url="https://pierre.test"
        user={user}
        onCurrentUserPasswordChange={async () => {}}
        onUserChange={() => {}}
      />
    )
    expect(html).toContain('Profils')
    expect(html).toContain('Utilisateurs')
    expect(html).toContain('Encyclopédie')
    expect(html).toContain('Conversations')
    expect(html).toContain('Statistiques')
    expect(html).toContain('Paramétrage')
    expect(html).toContain('Importer un CSV')
    expect(html).toContain('Créer')
    expect(html).not.toContain('Affecter un profil')
    expect(html).not.toContain('tout sélectionner')
  })

  test('uses the tab-panel hiding contract', () => {
    const html = renderToStaticMarkup(
      <AdministrationView
        hidden
        url="https://pierre.test"
        user={user}
        onCurrentUserPasswordChange={async () => {}}
        onUserChange={() => {}}
      />
    )
    expect(html).toContain('data-tab-panel="true"')
    expect(html).toContain('hidden')
  })
})
