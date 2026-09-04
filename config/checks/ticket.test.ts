import { expect, test } from 'bun:test'

import ticketConfig from '../../customization/tickets/config'
import { validateWorkflowConfig } from './workflow-config'

const NON_TRAITEES_BUCKET_ID = 'non_traitees'

/** Throw si `customization/tickets/config.ts` n’est pas conforme. */
function assertTicketConfig(config: unknown): void {
  const errors: string[] = []

  if (config == null || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('ticket: config doit être un objet')
  }

  const root = config as Record<string, unknown>
  errors.push(
    ...validateWorkflowConfig(root, {
      namespace: 'ticket',
      requiredBucketIds: [NON_TRAITEES_BUCKET_ID]
    })
  )

  const application = root.external_application
  if (application !== undefined && application !== null) {
    if (typeof application !== 'object' || Array.isArray(application)) {
      errors.push('ticket.external_application: objet ou null requis')
    } else {
      const external = application as Record<string, unknown>
      const name = external.name
      const pattern = external.url_pattern
      const selector = external.message_selector
      if (typeof name !== 'string' || !name.trim()) {
        errors.push('ticket.external_application.name: string non vide requise')
      }
      if (typeof selector !== 'string' || !selector.trim()) {
        errors.push('ticket.external_application.message_selector: string non vide requise')
      }
      if (typeof pattern !== 'string' || !pattern.trim()) {
        errors.push('ticket.external_application.url_pattern: string non vide requise')
      } else {
        try {
          const parsed = new URL(pattern.replaceAll(/\{\{[^{}]+\}\}/g, 'placeholder'))
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
        } catch {
          errors.push('ticket.external_application.url_pattern: URL HTTP(S) absolue requise')
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
}

test('ticket config.ts', () => {
  assertTicketConfig(ticketConfig)
  console.log(`✅ ticket config.ts est OK!`)
})

test('external_application accepte une URL sans placeholder', () => {
  expect(() =>
    assertTicketConfig({
      ...ticketConfig,
      external_application: {
        ...ticketConfig.external_application,
        url_pattern: 'http://outil-interne.local/reclamations'
      }
    })
  ).not.toThrow()
})

test('external_application peut être absente ou null', () => {
  const { external_application: _externalApplication, ...withoutApplication } = ticketConfig
  expect(() => assertTicketConfig(withoutApplication)).not.toThrow()
  expect(() => assertTicketConfig({ ...ticketConfig, external_application: null })).not.toThrow()
})

test('external_application refuse un objet incomplet', () => {
  expect(() =>
    assertTicketConfig({
      ...ticketConfig,
      external_application: { name: 'Aravis' }
    })
  ).toThrow(/external_application/)
})
