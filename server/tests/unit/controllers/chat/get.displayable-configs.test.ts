import { expect, it } from 'bun:test'

import defaultConfig from '../../../../../customization/chatbot/default/config'
import testing1Config from '../../../../../customization/chatbot/testing_purpose_1/config'
import { get_displayable_configs } from '../../../../controllers/chat/get'
import type { Parsed_User } from '../../../../utils/_schema'

it('anonymous user sees profiles from active config show only', async () => {
  const configs = await get_displayable_configs({
    user: null,
    active_config: defaultConfig
  })

  expect(configs.map((c) => c.id).sort()).toEqual(['default', 'demo', 'zmode'])
})

it('authenticated user sees exactly profiles listed in user.config', async () => {
  const user: Parsed_User = {
    email: 'collab@test.org',
    role: 'collaborator',
    password_hash: 'hash',
    config: ['agent_astreinte', 'cadre_astreinte', 'demo']
  }

  const configs = await get_displayable_configs({
    user,
    active_config: defaultConfig
  })

  expect(configs.map((c) => c.id).sort()).toEqual(['demo'])
  expect(configs.map((c) => c.id)).not.toContain('default')
  expect(configs.map((c) => c.id)).not.toContain('zmode')
})

it('authenticated user is not limited by active config show', async () => {
  const user: Parsed_User = {
    email: 'test@test.org',
    role: 'collaborator',
    password_hash: 'hash',
    config: ['demo', 'testing_purpose_1', 'testing_purpose_2']
  }

  const configs = await get_displayable_configs({
    user,
    active_config: testing1Config
  })

  expect(configs.map((c) => c.id).sort()).toEqual(
    ['demo', 'testing_purpose_1', 'testing_purpose_2'].sort()
  )
  expect(configs.map((c) => c.id)).not.toContain('default')
})
