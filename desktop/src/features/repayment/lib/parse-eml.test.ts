import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import { MAX_EML_BYTES, parseEml, parseEmlFile } from '@/shared/lib/activities/parse-eml'

const originalDom = new Map<string, unknown>()

beforeAll(() => {
  if (typeof globalThis.DOMParser === 'function') return
  const dom = new JSDOM('<!DOCTYPE html><html></html>')
  originalDom.set('DOMParser', (globalThis as { DOMParser?: unknown }).DOMParser)
  globalThis.DOMParser = dom.window.DOMParser
})

afterAll(() => {
  if (!originalDom.has('DOMParser')) return
  const previous = originalDom.get('DOMParser')
  if (previous === undefined) delete (globalThis as { DOMParser?: unknown }).DOMParser
  else (globalThis as { DOMParser: unknown }).DOMParser = previous
})

describe('parseEml', () => {
  test('lit From, To, objet, corps et date d’un message texte', async () => {
    const parsed = await parseEml(
      [
        'From: Alice Dupont <alice@bailleur.fr>',
        'To: Bob Martin <bob@locataire.fr>',
        'Subject: Relance loyer',
        'Date: Wed, 12 Aug 2026 10:00:00 +0200',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Bonjour,',
        '',
        'Merci de régulariser.'
      ].join('\r\n')
    )
    expect(parsed).toEqual({
      from: 'Alice Dupont <alice@bailleur.fr>',
      to: 'Bob Martin <bob@locataire.fr>',
      subject: 'Relance loyer',
      body: 'Bonjour,\n\nMerci de régulariser.',
      sentAt: '2026-08-12T08:00:00Z'
    })
  })

  test('coupe le fil cité après De :', async () => {
    const parsed = await parseEml(
      [
        'From: alice@bailleur.fr',
        'To: bob@locataire.fr',
        'Subject: Re: Relance',
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Voici la suite.',
        '',
        'De : Bob Martin <bob@locataire.fr>',
        'Envoyé : mardi 11 août',
        'Objet : Relance',
        '',
        'Ancien message'
      ].join('\r\n')
    )
    expect(parsed?.body).toBe('Voici la suite.')
    expect(parsed?.body).not.toContain('Ancien message')
  })

  test('coupe la signature RFC -- ', async () => {
    const parsed = await parseEml(
      [
        'From: alice@bailleur.fr',
        'To: bob@locataire.fr',
        'Subject: Relance',
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Corps utile.',
        '-- ',
        'Alice Dupont',
        'Gestion locative'
      ].join('\r\n')
    )
    expect(parsed?.body).toBe('Corps utile.')
  })

  test('retire blockquote HTML et les images', async () => {
    const parsed = await parseEml(
      [
        'From: alice@bailleur.fr',
        'To: bob@locataire.fr',
        'Subject: HTML',
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        '',
        '<html><body><p>Nouveau</p><img src="cid:x" alt="logo"><blockquote>Ancien fil</blockquote></body></html>'
      ].join('\r\n')
    )
    expect(parsed?.body).toBe('Nouveau')
    expect(parsed?.body).not.toContain('Ancien fil')
  })

  test('ignore les pièces jointes d’un multipart', async () => {
    const parsed = await parseEml(
      [
        'From: alice@bailleur.fr',
        'To: bob@locataire.fr',
        'Subject: Avec PJ',
        'MIME-Version: 1.0',
        'Content-Type: multipart/mixed; boundary="BOUND"',
        '',
        '--BOUND',
        'Content-Type: text/plain; charset=utf-8',
        '',
        'Juste le texte.',
        '--BOUND',
        'Content-Type: application/pdf; name="facture.pdf"',
        'Content-Disposition: attachment; filename="facture.pdf"',
        'Content-Transfer-Encoding: base64',
        '',
        'JVBERi0=',
        '--BOUND--'
      ].join('\r\n')
    )
    expect(parsed?.body).toBe('Juste le texte.')
    expect(parsed?.subject).toBe('Avec PJ')
  })

  test('refuse un message sans objet ni corps', async () => {
    expect(await parseEml('From: a@b.fr\r\nTo: c@d.fr\r\n\r\n')).toBeNull()
  })
})

describe('parseEmlFile', () => {
  test('refuse un fichier trop gros ou sans extension .eml', async () => {
    const emlFile = new File(['From: a@b.fr\nSubject: X\n\nHi'], 'mail.eml', {
      type: 'message/rfc822'
    })
    Object.defineProperty(emlFile, 'size', { value: MAX_EML_BYTES + 1 })
    expect(await parseEmlFile(emlFile)).toBeNull()
    expect(await parseEmlFile(new File(['Hi'], 'mail.msg'))).toBeNull()
  })
})
