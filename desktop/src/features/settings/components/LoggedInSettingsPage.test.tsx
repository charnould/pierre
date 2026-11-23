import { describe, expect, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { UiSettingsProvider } from '@/contexts/UiSettingsContext'
import type { Settings } from '@/shared/types'
import type { UserPrincipal } from '@/shared/types/users'

import { LoggedInSettingsPage } from './LoggedInSettingsPage'

const settings: Settings = {
  url: 'https://pierre.test',
  email: 'ada@pierre.test'
}

const user: UserPrincipal = {
  email: 'ada@pierre.test',
  isAdministrator: false,
  moduleIds: [],
  chatbotIds: [],
  preferredName: null
}

describe('LoggedInSettingsPage', () => {
  test('opens with the document title', () => {
    const html = renderToStaticMarkup(
      <UiSettingsProvider>
        <LoggedInSettingsPage
          settings={settings}
          user={user}
          agentName="Pierre"
          onHome={() => {}}
          onUserChange={() => {}}
          onLogout={() => {}}
        />
      </UiSettingsProvider>
    )
    expect(html).toContain(
      '<h1 class="font-serif text-4xl leading-tight font-normal">Paramètres</h1>'
    )
  })
})
