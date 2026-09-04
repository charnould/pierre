import { describe, expect, test } from 'bun:test'

import {
  getTicketExternalApplication,
  resolveTicketExternalApplicationUrl
} from './ticket-external-application'

describe('getTicketExternalApplication', () => {
  test('retourne une configuration complète et normalisée', () => {
    expect(
      getTicketExternalApplication({
        external_application: {
          name: ' Aravis ',
          url_pattern: 'https://aravis.test/{{id_reclamation}}',
          message_selector: ' textarea '
        }
      })
    ).toEqual({
      name: 'Aravis',
      urlPattern: 'https://aravis.test/{{id_reclamation}}',
      messageSelector: 'textarea'
    })
  })

  test('désactive une configuration absente, null ou incomplète', () => {
    expect(getTicketExternalApplication({})).toBeNull()
    expect(getTicketExternalApplication({ external_application: null })).toBeNull()
    expect(
      getTicketExternalApplication({
        external_application: { name: 'Aravis' }
      })
    ).toBeNull()
  })
})

describe('resolveTicketExternalApplicationUrl', () => {
  test('accepte une URL sans variable', () => {
    expect(
      resolveTicketExternalApplicationUrl('http://outil.local/reclamations', {
        id_reclamation: 'REC-1'
      })
    ).toBe('http://outil.local/reclamations')
  })

  test('substitue et encode toute colonne du ticket', () => {
    expect(
      resolveTicketExternalApplicationUrl(
        'https://outil.test/dossiers/{{id_locataire}}?reclamation={{ id_reclamation }}',
        { id_locataire: 'LOC/1', id_reclamation: 'REC 2' }
      )
    ).toBe('https://outil.test/dossiers/LOC%2F1?reclamation=REC%202')
  })

  test('refuse une variable absente ou une URL non HTTP', () => {
    expect(
      resolveTicketExternalApplicationUrl('https://outil.test/{{reference_inconnue}}', {})
    ).toBeNull()
    expect(
      resolveTicketExternalApplicationUrl('file:///tmp/{{id_reclamation}}', {
        id_reclamation: 'REC-1'
      })
    ).toBeNull()
  })
})
