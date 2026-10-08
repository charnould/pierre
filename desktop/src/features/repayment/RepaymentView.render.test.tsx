import { afterEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@test/instance-customization-fixture'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

import { NavigationHistoryProvider } from '@/contexts/NavigationHistoryContext'
import type { NotificationsApi } from '@/features/activity/hooks/use-notifications'
import { resetCustomization } from '@/shared/lib/instance-customization'

import { RepaymentView } from './RepaymentView'

const CAF_MESSAGE = {
  kind: 'email' as const,
  to: 'caf' as const,
  group: 'Email à la CAF',
  action: 'Contacter la CAF',
  label: 'Renvoi de quittances',
  subject: 'Dossier {{id_locataire}} — Transmission des quittances de loyer demandées',
  body: "Madame, Monsieur,\nNous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.",
  email: 'caf@example.fr'
}

describe('RepaymentView', () => {
  afterEach(() => {
    resetCustomization()
  })

  test('renders the board once the module is ready', async () => {
    loadCustomizationFixture({
      repayments: {
        phases: [
          'Non traités',
          'Recouvrement amiable',
          'Plan amiable / EV en cours',
          'Clients partis'
        ],
        caseActions: ['Analyser le dossier', 'Contacter la CAF'],
        batchActions: ['Envoyer un RCS de relance'],
        tags: ['Décès', '+65 ans'],
        senderEmail: 'loyer@dribble.football',
        messages: [CAF_MESSAGE],
        schedule: {
          defaultInstallments: 6,
          maxEffortPercent: 35,
          minDailyRemainderEuros: 15,
          confirmAfterInstallments: {
            '12': 'Un échéancier de plus de 12 mensualités doit être confirmé.'
          }
        },
        documentTags: { diagnostic: null, plan: null, protocole: null }
      }
    })
    const previous = window.api
    window.api = {
      getLedger: async () => ({
        data: [],
        meta: { columns: [], snapshot_date: '', gestionnaire_assignable: false }
      }),
      getDatastoreTables: async () => ({
        data: { tables: [{ name: 'comptes_locataires', exists: true }] }
      })
    } as unknown as typeof window.api
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    try {
      await act(async () => {
        root.render(
          <NavigationHistoryProvider activeTab="repayment" onTabChange={() => {}}>
            <RepaymentView
              hidden={false}
              url="http://localhost"
              repaymentDeps={{
                notifications: { rows: [] } as unknown as NotificationsApi,
                userLogin: 'admin'
              }}
            />
          </NavigationHistoryProvider>
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(host.textContent).not.toContain('Une erreur est survenue')
      expect(host.textContent).not.toContain('Module non paramétré')
      expect(host.textContent).toContain('Non traités')
      expect(host.textContent).toContain('Créer un dossier')
    } finally {
      await act(async () => root.unmount())
      host.remove()
      window.api = previous
    }
  })

  test('shows the board for a dossier saved without the ledger table', async () => {
    loadCustomizationFixture({
      repayments: {
        phases: ['Non traités', 'Clients partis'],
        caseActions: [],
        batchActions: [],
        tags: [],
        senderEmail: 'loyer@dribble.football',
        messages: [],
        schedule: {
          defaultInstallments: 6,
          maxEffortPercent: 35,
          minDailyRemainderEuros: 15,
          confirmAfterInstallments: {}
        },
        documentTags: { diagnostic: null, plan: null, protocole: null }
      }
    })
    const previous = window.api
    window.api = {
      getLedger: async () => ({
        data: [
          { id_locataire: 'LOC-9', id_client: 'CLI-9', solde_locataire: 300, statut: 'client' }
        ],
        meta: {
          columns: [
            { name: 'id_locataire', type: 'TEXT' },
            { name: 'id_client', type: 'TEXT' },
            { name: 'solde_locataire', type: 'REAL' }
          ],
          snapshot_date: '',
          gestionnaire_assignable: true
        }
      }),
      getDatastoreTables: async () => ({
        data: { tables: [{ name: 'comptes_locataires', exists: false }] }
      })
    } as unknown as typeof window.api
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    try {
      await act(async () => {
        root.render(
          <NavigationHistoryProvider activeTab="repayment" onTabChange={() => {}}>
            <RepaymentView
              hidden={false}
              url="http://localhost"
              repaymentDeps={{
                notifications: { rows: [] } as unknown as NotificationsApi,
                userLogin: 'admin'
              }}
            />
          </NavigationHistoryProvider>
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(host.textContent).toContain('Non traités')
      expect(host.textContent).toContain('1 dossier')
      expect(host.textContent).toContain('300')
      expect(host.textContent).toContain('Créer un dossier')
      expect(host.textContent).not.toContain('n’est pas disponible')
    } finally {
      await act(async () => root.unmount())
      host.remove()
      window.api = previous
    }
  })
})
