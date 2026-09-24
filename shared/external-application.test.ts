import { describe, expect, test } from 'bun:test'

import {
  classifyLaunchTarget,
  isCssSelector,
  readExternalApplication,
  resolveExternalApplicationTarget,
  validateExternalApplication,
  type ExternalApplication
} from './external-application'

const browser = {
  name: 'Injecter dans la page',
  transport: 'browser' as const,
  clipboard: true,
  url: 'https://outil.test/{{id_reclamation}}',
  selector: '#reponse'
}

const textEdit: ExternalApplication = {
  name: 'Ouvrir TextEdit',
  transport: 'external',
  clipboard: true,
  url: '/System/Applications/TextEdit.app'
}

describe('validateExternalApplication', () => {
  test('accepte une passerelle absente ou null', () => {
    expect(validateExternalApplication(undefined, 'ticket.external_application')).toEqual([])
    expect(validateExternalApplication(null, 'ticket.external_application')).toEqual([])
  })

  test('accepte le navigateur, TextEdit, un schéma et un chemin Windows', () => {
    expect(validateExternalApplication(browser, 'ticket.external_application')).toEqual([])
    expect(validateExternalApplication(textEdit, 'ticket.external_application')).toEqual([])
    expect(
      validateExternalApplication(
        {
          name: 'Ouvrir Aravis',
          transport: 'external',
          clipboard: true,
          url: 'monapp://dossier/{{id_reclamation}}'
        },
        'ticket.external_application'
      )
    ).toEqual([])
    expect(
      validateExternalApplication(
        {
          name: 'Ouvrir Aravis',
          transport: 'external',
          clipboard: false,
          url: 'C:\\Program Files\\Aravis\\Aravis.exe'
        },
        'ticket.external_application'
      )
    ).toEqual([])
    expect(
      validateExternalApplication(
        {
          ...browser,
          clipboard: false,
          selector: undefined,
          url: 'http://outil-interne.local/reclamations'
        },
        'ticket.external_application'
      )
    ).toEqual([])
  })

  test('refuse un objet incomplet, un transport inconnu et un clipboard non booléen', () => {
    expect(
      validateExternalApplication({ name: 'Aravis' }, 'ticket.external_application').length
    ).toBeGreaterThan(0)
    expect(
      validateExternalApplication(
        { ...browser, transport: 'deeplink' },
        'ticket.external_application'
      ).join('\n')
    ).toContain('transport')
    expect(
      validateExternalApplication(
        { ...browser, clipboard: 'true' },
        'ticket.external_application'
      ).join('\n')
    ).toContain('clipboard')
  })

  test('exige le sélecteur pour injecter, et l’interdit sinon', () => {
    expect(
      validateExternalApplication(
        { ...browser, selector: undefined },
        'ticket.external_application'
      ).join('\n')
    ).toContain('selector')
    expect(
      validateExternalApplication(
        { ...browser, selector: '[' },
        'ticket.external_application'
      ).join('\n')
    ).toContain('selector')
    expect(
      validateExternalApplication(
        { ...textEdit, selector: '#reponse' },
        'ticket.external_application'
      ).join('\n')
    ).toContain('selector')
    expect(
      validateExternalApplication(
        { ...browser, clipboard: false, selector: '#reponse' },
        'ticket.external_application'
      ).join('\n')
    ).toContain('selector')
  })

  test('accepte les formes de sélecteur et refuse une URL navigateur non HTTP', () => {
    for (const selector of [
      '#id',
      '.classe',
      '[data-reply]',
      'div.classe textarea[name="reponse"]'
    ]) {
      expect(
        validateExternalApplication({ ...browser, selector }, 'ticket.external_application')
      ).toEqual([])
    }
    expect(
      validateExternalApplication(
        { ...browser, url: 'monapp://dossier' },
        'ticket.external_application'
      ).join('\n')
    ).toContain('HTTP')
    expect(
      validateExternalApplication(
        { ...textEdit, url: 'file:///tmp/note.txt' },
        'ticket.external_application'
      ).join('\n')
    ).toContain('url')
    expect(
      validateExternalApplication(
        { ...textEdit, url: 'javascript:alert(1)' },
        'ticket.external_application'
      ).join('\n')
    ).toContain('url')
  })
})

describe('readExternalApplication', () => {
  test('normalise une config complète et ignore une config inutilisable', () => {
    expect(
      readExternalApplication({ external_application: { ...browser, name: '  Injecter  ' } })
    ).toEqual({
      ...browser,
      name: 'Injecter'
    })
    expect(readExternalApplication({})).toBeNull()
    expect(readExternalApplication({ external_application: null })).toBeNull()
    expect(readExternalApplication({ external_application: { name: 'Aravis' } })).toBeNull()
  })
})

describe('resolveExternalApplicationTarget', () => {
  test('encode une colonne dans une URL et laisse un chemin Windows intact', () => {
    expect(resolveExternalApplicationTarget(browser, { id_reclamation: 'REC 2' })).toBe(
      'https://outil.test/REC%202'
    )
    expect(
      resolveExternalApplicationTarget(
        {
          name: 'Ouvrir Aravis',
          transport: 'external',
          clipboard: true,
          url: 'C:\\Program Files\\Aravis\\{{id_reclamation}}.exe'
        },
        { id_reclamation: 'REC 2' }
      )
    ).toBe('C:\\Program Files\\Aravis\\REC 2.exe')
  })

  test('refuse une colonne absente, file et un schéma navigateur', () => {
    expect(resolveExternalApplicationTarget(browser, {})).toBeNull()
    expect(
      resolveExternalApplicationTarget(
        { ...textEdit, url: 'file:///tmp/{{id_reclamation}}' },
        { id_reclamation: '1' }
      )
    ).toBeNull()
    expect(resolveExternalApplicationTarget(textEdit, {})).toBe('/System/Applications/TextEdit.app')
  })
})

describe('classifyLaunchTarget', () => {
  test('distingue un chemin d’une URL et refuse les schémas dangereux', () => {
    expect(classifyLaunchTarget('C:\\Windows\\System32\\notepad.exe')).toEqual({
      kind: 'path',
      path: 'C:\\Windows\\System32\\notepad.exe'
    })
    expect(classifyLaunchTarget('/System/Applications/TextEdit.app')?.kind).toBe('path')
    expect(classifyLaunchTarget('https://outil.test/dossier')?.kind).toBe('url')
    expect(classifyLaunchTarget('monapp://dossier/1')?.kind).toBe('url')
    expect(classifyLaunchTarget('file:///tmp/a')).toBeNull()
    expect(classifyLaunchTarget('javascript:alert(1)')).toBeNull()
    expect(classifyLaunchTarget('data:text/html,hi')).toBeNull()
  })
})

describe('isCssSelector', () => {
  test('accepte id, classe et data-*, et refuse un sélecteur ouvert', () => {
    expect(isCssSelector('#pierre-bridge-demo-answer')).toBe(true)
    expect(isCssSelector('.classe')).toBe(true)
    expect(isCssSelector('[data-reply]')).toBe(true)
    expect(isCssSelector('[')).toBe(false)
    expect(isCssSelector('   ')).toBe(false)
  })
})
