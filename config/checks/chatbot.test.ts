import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import {
  chatbotSiteFields,
  DefaultChatbotConfig,
  InternalChatbotConfig,
  SkillConfig
} from '../../server/utils/_schema'

const CUSTOMIZATION_DIR = resolve(import.meta.dir, '../../customization')

const shared = {
  display: 'X',
  community_knowledge: false,
  reasoning_effort: 'medium' as const,
  trace: 'none' as const,
  attachments: true
}

test('default chatbot config parses with site fields', async () => {
  const config = (await import('../../customization/chatbots/default/config')).default
  const check = DefaultChatbotConfig.safeParse(config)
  expect(check.success).toBe(true)
})

test('internal chatbot configs parse without public-only fields', async () => {
  const directories = await readdir(join(CUSTOMIZATION_DIR, 'chatbots'))

  for (const directory of directories) {
    if (directory === 'default') continue
    const path = join(CUSTOMIZATION_DIR, 'chatbots', directory, 'config.ts')
    if (!(await Bun.file(path).exists())) continue
    const config = (await import(`../../customization/chatbots/${directory}/config`)).default
    const check = InternalChatbotConfig.safeParse(config)
    expect(check.success, directory).toBe(true)
    expect(DefaultChatbotConfig.safeParse(config).success, directory).toBe(false)
  }
})

test('default schema requires enabled and custom_data', () => {
  const config = { id: 'default', ...shared }
  expect(DefaultChatbotConfig.safeParse(config).success).toBe(false)
  expect(
    DefaultChatbotConfig.safeParse({
      ...config,
      enabled: true,
      custom_data: {}
    }).success
  ).toBe(true)
})

test('internal schema accepts chrome fields and rejects public-only fields', () => {
  const config = { id: 'interne', ...shared }
  expect(InternalChatbotConfig.safeParse(config).success).toBe(true)
  expect(
    InternalChatbotConfig.safeParse({
      ...config,
      greetings: ['Bonjour'],
      examples: [],
      disclaimer: null
    }).success
  ).toBe(true)
  expect(
    InternalChatbotConfig.safeParse({
      ...config,
      enabled: true
    }).success
  ).toBe(false)
  expect(
    InternalChatbotConfig.safeParse({
      ...config,
      custom_data: {}
    }).success
  ).toBe(false)
})

test('chatbotSiteFields hides blank chrome', () => {
  expect(
    chatbotSiteFields({
      id: 'interne',
      ...shared,
      greetings: ['  ', 'Bonjour'],
      examples: null,
      disclaimer: '   '
    })
  ).toEqual({
    greetings: ['Bonjour'],
    examples: [],
    disclaimer: null
  })
})

test('skill configs reject chatbot-only fields and require trace', () => {
  const config = {
    id: 'skill.x',
    display: 'X',
    community_knowledge: false,
    reasoning_effort: 'medium'
  }
  expect(SkillConfig.safeParse(config).success).toBe(false)
  expect(SkillConfig.safeParse({ ...config, trace: 'expanded' }).success).toBe(true)
  expect(
    SkillConfig.safeParse({
      ...config,
      trace: 'expanded',
      greetings: ['hello'],
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
