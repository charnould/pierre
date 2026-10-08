import { describe, expect, test } from 'bun:test'

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'

import { RepaymentMessagesCard, RepaymentMessageTestDialog } from './RepaymentMessagesCard'
import { RepaymentDocuments, SetupPanel, StoredMark, TemplateOptionLabel } from './SetupPanel'

describe('StoredMark', () => {
  test('names the stored piece and the missing one', () => {
    const stored = renderToStaticMarkup(<StoredMark name="Configuration, enregistrée" />)
    const missing = renderToStaticMarkup(<StoredMark stored={false} name="À paramétrer" />)
    expect(stored).toContain('Configuration, enregistrée')
    expect(stored).toContain('lucide-check')
    expect(stored).not.toContain('lucide-circle')
    expect(missing).toContain('À paramétrer')
    expect(missing).toContain('lucide-circle')
    expect(missing).not.toContain('lucide-check')
  })
})

describe('TemplateOptionLabel', () => {
  test('names a stored message template and leaves the others unmarked', () => {
    const stored = renderToStaticMarkup(<TemplateOptionLabel name="note.md" stored />)
    const missing = renderToStaticMarkup(<TemplateOptionLabel name="relance.md" stored={false} />)
    expect(stored).toContain('Modèle note.md, enregistré')
    expect(stored).toContain('lucide-check')
    expect(missing).toContain('relance.md')
    expect(missing).not.toContain('lucide-check')
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

describe('SetupPanel chatbots', () => {
  test('shows the public agent and each other agent', async () => {
    const previous = window.api
    window.api = {
      getAdminSetup: async () => ({
        texts: {
          'chatbots/default': '{ "id": "default" }',
          'chatbots/default/AGENTS.md': 'Consigne publique.',
          'chatbots/cadre': '{ "id": "cadre", "display": "Cadre d\'astreinte" }',
          'chatbots/cadre/AGENTS.md': 'Consigne cadre.'
        },
        binaries: [],
        ready: { 'chatbots/default': false }
      })
    } as unknown as typeof window.api
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    try {
      await act(async () => {
        root.render(
          <SetupPanel url="http://localhost" entryId="chatbots/default" onBack={() => {}} />
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      const tabs = [...host.querySelectorAll('[role="tab"]')].map(
        (tab) => tab.getAttribute('aria-label') || tab.textContent?.trim()
      )
      const panels = [...host.querySelectorAll('[role="tabpanel"]')]
      const visible = panels.filter((panel) => !panel.hasAttribute('hidden'))
      const create = host.querySelector('#nouvel-agent')
      expect(host.textContent).toContain('Agents conversationnels')
      expect(host.textContent).toContain('Pierre')
      expect(host.textContent).toContain('http://localhost')
      expect(host.textContent).not.toContain('[agentName]')
      expect(host.textContent).not.toContain('url_page_agent')
      expect(tabs).toEqual(['Agent public', "Cadre d'astreinte", 'Nouvel agent'])
      expect(host.querySelector('#agent-cadre [data-slot="card-title"]')?.textContent).toBe(
        "Agent « Cadre d'astreinte »"
      )
      const cadreAction = host.querySelector('#agent-cadre [data-slot="card-action"]')
      expect(cadreAction?.querySelector('span')?.getAttribute('aria-label')).toBe(
        "Agent « Cadre d'astreinte », enregistré"
      )
      expect(cadreAction?.querySelector('button')?.textContent).toBe('Supprimer')
      expect(host.textContent).not.toContain('Configuration, enregistrée')
      expect(host.textContent).not.toContain('Prompt système, enregistré')
      expect(visible).toHaveLength(1)
      const labels = [...(visible[0]?.querySelectorAll('label') ?? [])].map((label) =>
        label.textContent?.trim()
      )
      expect(labels.slice(0, 3)).toEqual(['Icône', 'Configuration', 'Prompt système'])
      const iconField = visible[0]?.querySelector('[data-orientation="horizontal"]')
      expect(iconField?.textContent).toContain('Icône')
      expect(iconField?.querySelector('input[type="file"]')).not.toBeNull()
      expect(
        [...(iconField?.querySelectorAll('[data-slot="input-group-addon"]') ?? [])].map((addon) =>
          addon.getAttribute('data-align')
        )
      ).toEqual(['inline-start', 'inline-end'])
      const drop = iconField?.querySelector('[data-slot="input-group"]')
      const browse = drop?.querySelector('button')
      expect(drop?.className).toContain('justify-between')
      expect(browse?.textContent).toContain('Parcourir')
      expect(browse?.className).toContain('border-border')
      const manuals = [...(visible[0]?.querySelectorAll('a') ?? [])]
      expect(manuals.map((link) => link.textContent)).toEqual(['documentation', 'documentation'])
      expect(
        manuals.every(
          (link) =>
            link.getAttribute('href') ===
              'https://github.com/charnould/pierre/tree/master/docs/src/05-user-manual' &&
            link.getAttribute('target') === '_blank'
        )
      ).toBe(true)
      expect(visible[0]?.textContent).toContain(
        'Saisissez un prompt système conforme à la documentation pour définir le comportement de l’agent.'
      )
      expect(visible[0]?.textContent).not.toContain(
        'Réservé aux collaborateurs auxquels il est attribué.'
      )
      expect(create?.textContent).toContain(
        'Collez ci-dessous un JSON valide, conforme à la documentation.'
      )
      expect(create?.textContent).not.toContain('Identifiant')
      expect(create?.querySelector('input')).toBeNull()
      expect(host.innerHTML).toContain('rows="3"')
      expect(host.innerHTML).toContain('data-min-lines="3"')
      expect(host.innerHTML).not.toContain('data-max-lines')
    } finally {
      await act(async () => root.unmount())
      host.remove()
      window.api = previous
    }
  })

  test('records a new agent from the id in its JSON and refuses a duplicate', async () => {
    const previous = window.api
    const written: Array<{ id: string; body: string }> = []
    const texts: Record<string, string> = {
      'chatbots/default': '{ "id": "default" }',
      'chatbots/default/AGENTS.md': 'Consigne publique.',
      'chatbots/cadre': '{ "id": "cadre" }',
      'chatbots/cadre/AGENTS.md': 'Consigne cadre.'
    }
    window.api = {
      getAdminSetup: async () => ({
        texts: { ...texts },
        binaries: [],
        ready: { 'chatbots/default': false }
      }),
      putAdminSetup: async (payload: { id: string; body?: string }) => {
        const body = payload.body ?? ''
        texts[payload.id] = body
        written.push({ id: payload.id, body })
        return { data: { id: payload.id } }
      }
    } as unknown as typeof window.api
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const fill = async (id: string, value: string) => {
      const textarea = host.querySelector(`[id="${id}"]`)
      if (!(textarea instanceof HTMLTextAreaElement)) throw new Error(id)
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
          textarea,
          value
        )
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }
    const save = async () => {
      const button = [...host.querySelectorAll('button')].find(
        (node) => node.textContent === 'Enregistrer'
      )
      if (!(button instanceof HTMLButtonElement)) throw new Error('Enregistrer')
      await act(async () => {
        button.click()
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
    }
    try {
      await act(async () => {
        root.render(
          <SetupPanel url="http://localhost" entryId="chatbots/default" onBack={() => {}} />
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      await fill('chatbots/__draft__', '{ "id": "cadre", "display": "Doublon" }')
      await save()
      expect(host.textContent).toContain('Identifiant déjà utilisé.')
      expect(written.map((row) => row.body)).not.toContain(
        '{ "id": "cadre", "display": "Doublon" }'
      )
      written.length = 0
      await fill('chatbots/__draft__', '{ "id": "astreinte" }')
      await save()
      expect(written).toEqual(
        expect.arrayContaining([
          { id: 'chatbots/astreinte', body: '{ "id": "astreinte" }' },
          { id: 'chatbots/astreinte/AGENTS.md', body: '' }
        ])
      )
      const cadre = written.find((row) => row.id === 'chatbots/cadre')
      expect(cadre?.body).toBe('{ "id": "cadre" }')
      expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim()).toBe(
        'astreinte'
      )
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
    expect(html.split('lucide-check').length - 1).toBe(1)
  })
})
