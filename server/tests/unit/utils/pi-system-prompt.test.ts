import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { buildConversationAgentsFile } from '../../../utils/copilot-agent'
import {
  datastorePaths,
  setDatastoreRoot,
  SMOLVM_BIN,
  testDatastorePaths
} from '../../../utils/paths'
import { emptyProviders } from '../../../utils/providers'
import { setup } from '../../../utils/setup'
import {
  buildPiCommand,
  getConversationWorkspacePath,
  PI_PACKAGE_PATH,
  PI_SYSTEM_PROMPT_PATH,
  piLaunch,
  providerFingerprint
} from '../../../utils/smolvm'
import { seedInstanceSetup } from '../../seed-setup'

const paths = testDatastorePaths('pi_system_prompt')
const convId = '0198f1a0-7b6c-7000-8000-000000000001'
const originalBunPort = Bun.env['BUN_PORT']

beforeEach(async () => {
  setDatastoreRoot(paths.root)
  await setup()
  await seedInstanceSetup()
  await mkdir(join(paths.knowledge, 'default'), { recursive: true })
})

afterEach(async () => {
  if (originalBunPort === undefined) delete Bun.env['BUN_PORT']
  else Bun.env['BUN_PORT'] = originalBunPort
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('Pi native system prompt and launch args', () => {
  it('appends the immutable PIERRE prompt, thinking level, and local package to the native Pi command', () => {
    const command = buildPiCommand('vm-test', {
      provider: 'anthropic',
      envArgs: ['-e', 'ANTHROPIC_API_KEY=test'],
      model: 'test-model',
      thinking: 'high'
    })
    expect(command[0]).toBe(SMOLVM_BIN)
    expect(command).toContain('--append-system-prompt')
    expect(command[command.indexOf('--append-system-prompt') + 1]).toBe(PI_SYSTEM_PROMPT_PATH)
    expect(command[command.indexOf('--thinking') + 1]).toBe('high')
    expect(command).toContain('read,bash,edit,write,grep,find,ls,ask_user')
    const piArgs = command.slice(command.indexOf('--') + 1)
    expect(piArgs[piArgs.indexOf('-e') + 1]).toBe(PI_PACKAGE_PATH)
  })

  it('omits ask_user, write, and edit from tools for autonomous runs while keeping the local package', () => {
    const command = buildPiCommand('vm-test', {
      provider: 'anthropic',
      envArgs: ['-e', 'ANTHROPIC_API_KEY=test'],
      model: 'test-model',
      autonomous: true
    })
    expect(command[command.indexOf('--tools') + 1]).toBe('read,bash,grep,find,ls')
    const piArgs = command.slice(command.indexOf('--') + 1)
    expect(piArgs[piArgs.indexOf('-e') + 1]).toBe(PI_PACKAGE_PATH)
  })

  it('injects NODE_COMPILE_CACHE, PIERRE_URL, and clean PIERRE_WARM_URL origin in piLaunch', () => {
    delete Bun.env['BUN_PORT']
    const baseLaunch = piLaunch()
    expect(baseLaunch.envArgs).toContain('NODE_COMPILE_CACHE=/opt/pierre/.node-cache')
    expect(baseLaunch.envArgs).toContain('PIERRE_URL=http://100.96.0.1:3000')

    Bun.env['BUN_PORT'] = '4567'
    expect(piLaunch().envArgs).toContain('PIERRE_URL=http://100.96.0.1:4567')

    const customOrigin = piLaunch({
      ...emptyProviders(),
      llmType: 'openai-compatible',
      llmBaseUrl: 'https://api.mistral.ai/v1/chat',
      llmApiKey: 'secret-key'
    })
    expect(customOrigin.envArgs).toContain('PIERRE_WARM_URL=https://api.mistral.ai')

    const anthropicDefault = piLaunch({
      ...emptyProviders(),
      llmType: 'anthropic',
      llmApiKey: 'secret-key'
    })
    expect(anthropicDefault.envArgs).toContain('PIERRE_WARM_URL=https://api.anthropic.com')
  })

  it('computes a sensitive providerFingerprint without leaking the raw API key', () => {
    expect(providerFingerprint(emptyProviders())).toBeNull()

    const secret = 'sk-super-secret-api-key-12345'
    const base = {
      ...emptyProviders(),
      llmType: 'anthropic' as const,
      llmBaseUrl: 'https://api.anthropic.com',
      llmModel: 'claude-sonnet-5-5',
      llmEffort: 'medium',
      llmApiKey: secret
    }
    const fp = providerFingerprint(base)
    expect(fp).toHaveLength(16)
    expect(fp).not.toContain(secret)
    expect(fp).not.toContain('sk-super')

    expect(providerFingerprint({ ...base, llmModel: 'claude-opus-5-5' })).not.toBe(fp)
    expect(providerFingerprint({ ...base, llmEffort: 'high' })).not.toBe(fp)
    expect(providerFingerprint({ ...base, llmApiKey: 'other-key' })).not.toBe(fp)
    expect(providerFingerprint({ ...base, llmBaseUrl: 'https://proxy.example.org/v1' })).not.toBe(
      fp
    )
    expect(providerFingerprint({ ...base, llmType: 'openai' })).not.toBe(fp)
  })

  it('keeps the conversation AGENTS file limited to dynamic context', async () => {
    await buildConversationAgentsFile(convId, 'default')

    const agents = await Bun.file(
      join(getConversationWorkspacePath('default', convId), 'AGENTS.md')
    ).text()
    expect(agents).toContain('<session>')
    expect(agents).not.toContain('<environment>')
    expect(agents).not.toContain('Do not install apt')
    expect(datastorePaths().knowledge).toBe(paths.knowledge)
  })
})
