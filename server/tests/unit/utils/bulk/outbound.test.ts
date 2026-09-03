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
  it('stores a Word summary in resume and leaves corps empty', () => {
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
      version: 1,
      action: 'R1',
      objet: '',
      corps: '',
      resume: 'Relance amiable du solde.',
      canal: 'courrier',
      delivery: { skippedSteps: [], history: [] }
    })
  })

  it('keeps rendered text in corps for a message step', () => {
    const step: SimpleDeliveryStep = {
      medium: 'email',
      action: 'Courriel',
      subject: 'Relance',
      body: 'Bonjour',
      placeholderBindings: {}
    }
    const rendered = render_fallback_step(row(), '2026-08-29T08:00:00.000Z', step)
    expect(JSON.parse(fallback_outbound_contenu(step, rendered, []))).toEqual({
      version: 1,
      action: 'Courriel',
      objet: 'Relance',
      corps: 'Bonjour',
      canal: 'email',
      delivery: { skippedSteps: [], history: [] }
    })
  })
})
