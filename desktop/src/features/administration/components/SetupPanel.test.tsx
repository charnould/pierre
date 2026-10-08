import { describe, expect, test } from 'bun:test'

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'

import { RepaymentMessagesCard, RepaymentMessageTestDialog } from './RepaymentMessagesCard'
import { RepaymentDocuments, SetupPanel, StoredMark, TemplateOptionLabel } from './SetupPanel'

describe('StoredMark', () => {
  test('names the stored piece', () => {
    const html = renderToStaticMarkup(<StoredMark name="Configuration, enregistrée" />)
    expect(html).toContain('Configuration, enregistrée')
    expect(html).toContain('lucide-circle-check')
    expect(html).not.toContain('lucide-circle ')
  })
})

describe('TemplateOptionLabel', () => {
  test('names a stored message template and leaves the others unmarked', () => {
    const stored = renderToStaticMarkup(<TemplateOptionLabel name="note.md" stored />)
    const missing = renderToStaticMarkup(<TemplateOptionLabel name="relance.md" stored={false} />)
    expect(stored).toContain('Modèle note.md, enregistré')
    expect(stored).toContain('lucide-circle-check')
    expect(missing).toContain('relance.md')
    expect(missing).not.toContain('lucide-circle-check')
    expect(missing).not.toContain('enregistré')
  })
})

describe('RepaymentMessagesCard', () => {
  test('titles the messages and shows only Ajouter when nothing is stored', () => {
    const html = renderToStaticMarkup(
      <RepaymentMessagesCard
        url="http://localhost"
        stored={null}
        onDrafts={() => {}}
        onTouch={() => {}}
      >
        <p>JSON</p>
      </RepaymentMessagesCard>
    )
    const json = html.indexOf('>JSON<')
    const title = html.indexOf('Messages')
    const help = html.indexOf('Un JSON est un RCS')
    expect(json).toBeGreaterThan(-1)
    expect(title).toBeGreaterThan(json)
    expect(help).toBeGreaterThan(title)
    expect(html).toContain('Ajouter')
    expect(html).not.toContain('Coller un JSON ou un Markdown')
    expect(html).not.toContain('>Vérifier<')
    expect(html).not.toContain('data-variant="rows"')
  })

  test('shows verify, test and delete on one line, with test disabled', () => {
    const html = renderToStaticMarkup(
      <RepaymentMessagesCard
        url="http://localhost"
        stored={JSON.stringify(['{"label":"relance"}'])}
        onDrafts={() => {}}
        onTouch={() => {}}
      >
        <p>JSON</p>
      </RepaymentMessagesCard>
    )
    const verify = html.indexOf('>Vérifier<')
    const test = html.indexOf('>Tester<')
    const remove = html.indexOf('Supprimer le message')
    const tester = html.match(/<button\b[^>]*>Tester<\/button>/)?.[0] ?? ''
    const verifier = html.match(/<button\b[^>]*>Vérifier<\/button>/)?.[0] ?? ''
    expect(html).toContain('flex-nowrap')
    expect(verify).toBeGreaterThan(-1)
    expect(test).toBeGreaterThan(verify)
    expect(remove).toBeGreaterThan(test)
    expect(tester).toMatch(/\sdisabled(?:=""|\s|>)/)
    expect(verifier).not.toMatch(/\sdisabled(?:=""|\s|>)/)
    expect(html).not.toContain('Ouvrir')
    expect(html).not.toContain('Téléphone')
  })

  test('asks for a phone or an email and warns that the test is fictive', async () => {
    const notice = 'Les données envoyées et les placeholders sont fictifs'
    async function markup(kind: 'rcs' | 'email', value: string) {
      const host = document.createElement('div')
      document.body.appendChild(host)
      const root = createRoot(host)
      await act(async () => {
        root.render(
          <RepaymentMessageTestDialog
            open
            kind={kind}
            value={value}
            sending={false}
            onValue={() => {}}
            onCancel={() => {}}
            onSend={() => {}}
          />
        )
      })
      const html = document.body.innerHTML
      await act(async () => root.unmount())
      host.remove()
      return html
    }
    const phone = await markup('rcs', '')
    const email = await markup('email', 'ada@exemple.fr')
    expect(phone).toContain('Téléphone')
    expect(phone).toContain(notice)
    expect(phone.match(/<button\b[^>]*>Envoyer<\/button>/)?.[0] ?? '').toMatch(/\sdisabled/)
    expect(email).toContain('Email')
    expect(email).not.toContain('>Téléphone<')
    expect(email).toContain(notice)
    expect(email.match(/<button\b[^>]*>Envoyer<\/button>/)?.[0] ?? '').not.toMatch(
      /\sdisabled(?:=""|\s|>)/
    )
  })

  test('sends a verified RCS through the official communication route', async () => {
    const text = JSON.stringify({
      group: 'RCS',
      action: 'Relancer',
      label: 'Relance',
      body: 'Réf {{id_locataire}}',
      sms_fallback: 'SMS {{telephone_client}}',
      choices: []
    })
    const sent: Array<{ ref: string }> = []
    const previous = window.api
    window.api = {
      verifyRepaymentMessage: async () => ({
        data: {
          kind: 'rcs' as const,
          group: 'RCS',
          action: 'Relancer',
          label: 'Relance',
          body: 'Réf {{id_locataire}}',
          sms_fallback: 'SMS {{telephone_client}}',
          choices: []
        }
      }),
      sendCommunication: async (payload: { ref: string }) => {
        sent.push(payload)
        return { data: { id: 1 } }
      }
    } as unknown as typeof window.api
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const click = async (name: string) => {
      const button = [...document.querySelectorAll('button')].find((node) =>
        node.textContent?.includes(name)
      )
      if (!(button instanceof HTMLButtonElement)) throw new Error(name)
      await act(async () => {
        button.click()
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }
    try {
      await act(async () => {
        root.render(
          <RepaymentMessagesCard
            url="http://localhost"
            stored={JSON.stringify([text])}
            onDrafts={() => {}}
            onTouch={() => {}}
          >
            <p>JSON</p>
          </RepaymentMessagesCard>
        )
      })
      await click('Vérifier')
      await click('Tester')
      const input = document.querySelector('input')
      if (!(input instanceof HTMLInputElement)) throw new Error('Téléphone')
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(
          input,
          '0612345678'
        )
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await click('Envoyer')
      expect(sent).toEqual([
        expect.objectContaining({
          url: 'http://localhost',
          channel: 'rcs',
          contexte: 'repayment',
          destinataire: '0612345678',
          contenu: {
            action: 'Relancer',
            body: 'Réf LOC-TEST',
            sms_fallback: 'SMS 0600000000',
            choices: []
          }
        })
      ])
      expect(sent[0]?.ref).toMatch(/^test-/)
    } finally {
      await act(async () => root.unmount())
      host.remove()
      window.api = previous
    }
  })
})

const STORED_CAF_MESSAGE = `---
group: Email à la CAF
action: Contacter la CAF
to: caf
label: Renvoi de quittances
subject: Dossier {{id_locataire}} — Transmission des quittances de loyer demandées
email: caf@example.fr
---

Madame, Monsieur,
En réponse à votre demande, vous trouverez ci-joint les quittances de loyer concernant M./Mme [Nom Prénom], allocataire n° [Numéro d'allocataire], pour la période de [Mois/Année] à [Mois/Année].
Ces documents sont transmis afin de permettre l'instruction ou la poursuite de l'examen du dossier de l'allocataire.
Nous restons à votre disposition pour tout renseignement complémentaire ou pour la transmission de toute pièce utile à l'étude de ce dossier.
Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.
`

describe('SetupPanel', () => {
  test('renders the stored CAF repayment message', async () => {
    const previous = window.api
    window.api = {
      getAdminSetup: async () => ({
        texts: {
          repayment: '{}',
          'repayment/AGENTS.md': 'réfléchis\n',
          'repayment/messages': JSON.stringify([STORED_CAF_MESSAGE])
        },
        binaries: [
          'repayment/plan.docx',
          'repayment/protocole.docx',
          'repayment/diagnostic.docx',
          'repayment/courrier.docx'
        ],
        ready: { repayment: true }
      })
    } as unknown as typeof window.api
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    try {
      await act(async () => {
        root.render(<SetupPanel url="http://localhost" entryId="repayment" onBack={() => {}} />)
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(host.textContent).toContain('Messages')
      expect(host.textContent).toContain('réfléchis')
      expect(host.innerHTML).toContain('Renvoi de quittances')
    } finally {
      await act(async () => root.unmount())
      host.remove()
      window.api = previous
    }
  })
})

describe('RepaymentDocuments', () => {
  test('lists the four documents and checks only the stored row', () => {
    const html = renderToStaticMarkup(
      <RepaymentDocuments stored={new Set(['repayment/plan.docx'])} onFile={() => {}} />
    )
    expect(html).toContain('Documents')
    expect(html).toContain('Plan d’apurement')
    expect(html).toContain('Protocole de cohésion sociale')
    expect(html).toContain('Diagnostic social et financier')
    expect(html).toContain('Courrier standard')
    expect(html).toContain('Plan d’apurement, enregistré')
    expect(html).not.toContain('Protocole de cohésion sociale, enregistré')
    expect(html).not.toContain('Avancement')
    expect(html.split('lucide-circle-check').length - 1).toBe(1)
  })
})
