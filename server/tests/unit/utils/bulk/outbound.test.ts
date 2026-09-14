import { describe, expect, it } from 'bun:test'

import type { PreviewRow, SimpleDeliveryStep } from '../../../../../shared/bulk-operations'
import { fallback_outbound_contenu, render_fallback_step } from '../../../../utils/bulk/outbound'

const row = (): PreviewRow => ({
  id_locataire: 'LOC-1',
  id_client: 'CLI-1',
  nom: 'Ada',
  email: 'ada@example.org',
  telephone: '0612345678',
  adresse: '1 rue A',
  gestionnaire: null,
  gestionnaire_email: null,
  values: {},
  status: 'eligible',
  route: { kind: 'fallback', medium: 'courrier', stepIndex: 0 },
  skippedSteps: []
})

describe('bulk outbound contenu', () => {
  it('stores a Word summary as the canonical body', () => {
    const step: SimpleDeliveryStep = {
      medium: 'courrier',
      action: 'R1',
      filename: 'R1.docx',
      fileBase64: 'UEs=',
      placeholders: [],
      placeholderBindings: {},
      summary: 'Relance amiable du solde.'
    }
    const rendered = render_fallback_step(row(), '2026-08-29T08:00:00.000Z', step)
    expect(rendered.body).toBe('')
    expect(JSON.parse(fallback_outbound_contenu(step, rendered, []))).toEqual({
      version: 2,
      action: 'R1',
      body: 'Relance amiable du solde.',
      purpose: 'bulk',
      skipped_steps: []
    })
  })

  it('keeps rendered text in the canonical body for a message step', () => {
    const step: SimpleDeliveryStep = {
      medium: 'email',
      action: 'Courriel',
      subject: 'Relance',
      body: 'Bonjour',
      placeholderBindings: {}
    }
    const rendered = render_fallback_step(row(), '2026-08-29T08:00:00.000Z', step)
    expect(JSON.parse(fallback_outbound_contenu(step, rendered, []))).toEqual({
      version: 2,
      action: 'Courriel',
      subject: 'Relance',
      body: 'Bonjour',
      purpose: 'bulk',
      skipped_steps: []
    })
  })
})
