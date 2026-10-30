import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { buildConversationAgentsFile } from '../../../utils/copilot-agent'
import { datastorePaths, setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'
import {
  buildPiCommand,
  getConversationWorkspacePath,
  PI_SYSTEM_PROMPT_PATH
} from '../../../utils/smolvm'
import { seedInstanceSetup } from '../../seed-setup'

const paths = testDatastorePaths('pi_system_prompt')
const convId = '0198f1a0-7b6c-7000-8000-000000000001'

beforeEach(async () => {
  setDatastoreRoot(paths.root)
  await setup()
  await seedInstanceSetup()
  await mkdir(join(paths.knowledge, 'default'), { recursive: true })
})

afterEach(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('Pi native system prompt', () => {
  it('appends the immutable PIERRE prompt to the native Pi command', () => {
    const command = buildPiCommand('vm-test', {
      provider: 'anthropic',
      envArgs: ['-e', 'ANTHROPIC_API_KEY=test'],
      model: 'test-model'
    })
    expect(command).toContain('--append-system-prompt')
    expect(command[command.indexOf('--append-system-prompt') + 1]).toBe(PI_SYSTEM_PROMPT_PATH)
    expect(command).toContain('read,bash,edit,write,grep,find,ls,ask_user')
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
