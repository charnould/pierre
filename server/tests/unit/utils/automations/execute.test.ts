import { describe, expect, it } from 'bun:test'

import type { AutomationRecord } from '../../../../../shared/automations'
import { assertCanonicalConversationId } from '../../../../utils/ai-attachments'
import { execute_automation } from '../../../../utils/automations/execute'
import { insertAutomationPrompt } from '../../../../utils/copilot-agent'
import { WORKFLOW_USER_PROMPT } from '../../../../utils/workflow-payload'

const report = {
  id: 'auto-1',
  type: 'report',
  name: 'Points chauds',
  description: '',
  status: 'running',
  owner: 'alice@example.org',
  mentions: [],
  cron: '0 8 * * 1',
  next_run_at: null,
  last_run_at: null,
  last_run_status: null,
  config: { prompt: 'Les impayés de la semaine.', maxReports: 6 }
} satisfies AutomationRecord

const run = (
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'toolCall'; id: string; name: string; arguments: unknown }
  >
) =>
  execute_automation(
    report,
    { runToken: 'run-1', signal: new AbortController().signal },
    async function* () {
      yield { type: 'message_end' as const, message: { role: 'assistant' as const, content } }
    }
  )

describe('report consigne', () => {
  it('replaces the slot with the form prompt', () => {
    const consigne = 'Consignes.\n\n<!-- AUTOMATION_PROMPT_HERE -->\n\nFin.'
    expect(insertAutomationPrompt(consigne, 'Les impayés.')).toBe(
      'Consignes.\n\nLes impayés.\n\nFin.'
    )
  })

  it('leaves the consigne unchanged when the slot is absent', () => {
    expect(insertAutomationPrompt('Consignes seules.', 'Les impayés.')).toBe('Consignes seules.')
  })
})

describe('report execution', () => {
  it('stores the article from the write call and ignores the sentence', async () => {
    let mission = ''
    let automationPrompt: string | undefined
    const result = await execute_automation(
      report,
      { runToken: 'run-1', signal: new AbortController().signal },
      async function* (convId, configId, prompt, _model, _signal, _images, _effort, options) {
        expect(assertCanonicalConversationId(convId)).toBe(convId)
        expect(configId).toBe('report')
        mission = prompt
        automationPrompt = options?.automationPrompt
        yield {
          type: 'tool_execution_start' as const,
          toolCallId: 'write-1',
          toolName: 'write',
          args: {
            path: 'rapport.html',
            content: '<article class="report"><p>Les impayés.</p></article>'
          }
        }
        yield {
          type: 'message_end' as const,
          message: {
            role: 'assistant' as const,
            content: [{ type: 'text' as const, text: 'Phrase après le dernier outil.' }]
          }
        }
      }
    )
    expect(mission).toBe(WORKFLOW_USER_PROMPT)
    expect(automationPrompt).toBe('Les impayés de la semaine.')
    expect(result.contenu).toBe('<article class="report"><p>Les impayés.</p></article>')
  })

  it('rejects a transcript without exactly one report article', async () => {
    await expect(run([{ type: 'text', text: '<p>Pas d’article.</p>' }])).rejects.toThrow(
      'Rapport invalide.'
    )
    await expect(
      run([
        {
          type: 'text',
          text: '<article class="report"><p>Un</p></article><article class="report"><p>Deux</p></article>'
        }
      ])
    ).rejects.toThrow('Rapport invalide.')
  })

  it('refuses a reply automation', async () => {
    await expect(
      execute_automation(
        {
          ...report,
          type: 'replies',
          config: {
            skillId: 'replies',
            channel: 'email',
            ticketFilters: { rules: [] },
            maxItems: 5
          }
        },
        { runToken: 'run-2', signal: new AbortController().signal }
      )
    ).rejects.toThrow('Pré-génération de réponses non disponible.')
  })
})
