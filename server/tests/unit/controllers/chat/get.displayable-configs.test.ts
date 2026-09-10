import { expect, it } from 'bun:test'

import defaultConfig from '../../../../../customization/chatbots/default/config'
import testing1Config from '../../../../../customization/chatbots/testing_purpose_1/config'
import { get_displayable_configs } from '../../../../controllers/chat/get'
import type { User } from '../../../../utils/_schema'

it('anonymous user sees profiles from active config show only', async () => {
  const configs = await get_displayable_configs({
    user: null,
    active_config: defaultConfig
  })

  expect(configs.map((c) => c.id).sort()).toEqual(['default', 'demo', 'zmode'])
})

it('authenticated user sees exactly the chatbots listed in user.chatbotIds', async () => {
  const user: User = {
    email: 'collab@test.org',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: ['agent_astreinte', 'cadre_astreinte', 'demo'],
    passwordHash: 'hash'
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
  const user: User = {
    email: 'test@test.org',
    isAdministrator: false,
    moduleIds: [],
    chatbotIds: ['demo', 'testing_purpose_1', 'testing_purpose_2'],
    passwordHash: 'hash'
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
