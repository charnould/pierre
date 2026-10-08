import { describe, expect, mock, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import { UI_SETTINGS_DEFAULTS } from '@/shared/lib/ui-settings/schema'
import type { Settings } from '@/shared/types'
import type { UserPrincipal } from '@/shared/types/users'

mock.module('@/contexts/UiSettingsContext', () => ({
  useUiSettings: () => ({
    settings: UI_SETTINGS_DEFAULTS,
    reload: async () => {},
    resetToFactory: async () => {},
    save: async () => UI_SETTINGS_DEFAULTS
  })
}))

const { LoggedInSettingsPage } = await import('./LoggedInSettingsPage')

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
      <LoggedInSettingsPage
        settings={settings}
        user={user}
        agentName="Pierre"
        onHome={() => {}}
        onUserChange={() => {}}
        onLogout={() => {}}
      />
    )
    expect(html).toContain(
      '<h1 class="font-serif text-4xl leading-tight font-normal">Paramètres</h1>'
    )
  })
})
