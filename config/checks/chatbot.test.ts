import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { ChatbotConfig, SkillConfig } from '../../server/utils/_schema'

const CUSTOMIZATION_DIR = resolve(import.meta.dir, '../../customization')

test('chatbot configs parse successfully', async () => {
  const directories = await readdir(join(CUSTOMIZATION_DIR, 'chatbots'))

  for (const directory of directories) {
    const path = join(CUSTOMIZATION_DIR, 'chatbots', directory, 'config.ts')
    if (!(await Bun.file(path).exists())) continue
    const config = (await import(`../../customization/chatbots/${directory}/config`)).default
    const check = ChatbotConfig.safeParse(config)
    expect(check.success, directory).toBe(true)
  }
})

test('chatbot configs require trace and attachments', () => {
  const config = {
    id: 'x',
    display: 'X',
    show: [],
    protected: false,
    community_knowledge: false,
    greeting: [],
    examples: [],
    disclaimer: null,
    custom_data: { format: () => '' },
    api: [],
    reasoning_effort: 'medium'
  }
  expect(ChatbotConfig.safeParse(config).success).toBe(false)
  expect(ChatbotConfig.safeParse({ ...config, trace: 'none' }).success).toBe(false)
  expect(ChatbotConfig.safeParse({ ...config, attachments: true }).success).toBe(false)
  expect(ChatbotConfig.safeParse({ ...config, trace: 'none', attachments: true }).success).toBe(
    true
  )
})

test('skill configs reject chatbot-only fields and require trace', () => {
  const config = {
    id: 'skill.x',
    display: 'X',
    protected: false,
    community_knowledge: false,
    reasoning_effort: 'medium'
  }
  expect(SkillConfig.safeParse(config).success).toBe(false)
  expect(SkillConfig.safeParse({ ...config, trace: 'expanded' }).success).toBe(true)
  expect(
    SkillConfig.safeParse({
      ...config,
      trace: 'expanded',
      greeting: ['hello'],
      attachments: true
    }).success
  ).toBe(false)
})

test('skill configs parse successfully', async () => {
  const directories = await readdir(join(CUSTOMIZATION_DIR, 'skills'))

  for (const directory of directories) {
    const path = join(CUSTOMIZATION_DIR, 'skills', directory, 'config.ts')
    if (!(await Bun.file(path).exists())) continue
    const config = (await import(`../../customization/skills/${directory}/config`)).default
    const check = SkillConfig.safeParse(config)
    expect(check.success, directory).toBe(true)
  }
})
