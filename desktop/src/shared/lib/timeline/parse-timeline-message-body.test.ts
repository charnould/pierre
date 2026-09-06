import { describe, expect, test } from 'bun:test'

import {
  isTimelineCommunicationType,
  parseTimelineMessageBody
} from './parse-timeline-message-body'

describe('isTimelineCommunicationType', () => {
  test('reconnaît les canaux et l’import .eml', () => {
    expect(isTimelineCommunicationType('email')).toBe(true)
    expect(isTimelineCommunicationType('email_import')).toBe(true)
    expect(isTimelineCommunicationType('rcs')).toBe(true)
    expect(isTimelineCommunicationType('courrier')).toBe(true)
    expect(isTimelineCommunicationType('note')).toBe(false)
  })
})

describe('parseTimelineMessageBody', () => {
  test('conserve reception_initiale hors du corps parsé', () => {
    const parsed = parseTimelineMessageBody({
      id: -1,
      date_creation: '2026-06-01T08:30:00Z',
      rattachement: 'tickets:REC-1',
      auteur: 'tenant:Locataire',
      id_client: null,
      id_locataire: 'LOC-1',
      id_lot: 'LOT-1',
      type: 'email',
      statut: 'received',
      mentions: [],
      contenu: JSON.stringify({
        version: 1,
        objet: 'Réclamation REC-1',
        corps: 'Fuite',
        reception_initiale: true
      })
    })
    expect(parsed).toEqual({
      kind: 'email',
      medium: 'email',
      subject: 'Réclamation REC-1',
      body: 'Fuite'
    })
  })
})
