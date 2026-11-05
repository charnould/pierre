import { type InstanceCustomization, loadCustomization } from '@/shared/lib/instance-customization'

export const CUSTOMIZATION_FIXTURE: InstanceCustomization = {
  name: 'Pierre',
  tickets: {
    buckets: [{ id: 'non_traitees', label: 'Réclamations' }],
    actions: {
      dossier: ['Analyser le dossier', 'Joindre le locataire']
    },
    tags: ['Urgent', 'Sécurité des personnes', 'Attente prestataire'],
    external_application: {
      name: 'Ouvrir TextEdit',
      transport: 'external',
      clipboard: true,
      url: '/System/Applications/TextEdit.app'
    }
  },
  repayments: {
    phases: ['Non traités', 'Recouvrement amiable', 'Contentieux', 'Clients partis'],
    caseActions: ['Analyser le dossier', 'Joindre le locataire'],
    batchActions: ['Envoyer un RCS de relance'],
    tags: ['décès', '+65 ans'],
    messages: [],
    schedule: {
      defaultInstallments: 6,
      maxEffortPercent: 35,
      minDailyRemainderEuros: 15,
      confirmAfterInstallments: {
        '12': 'Un échéancier de plus de 12 mensualités doit être confirmé.',
        '24': 'Un plan d’apurement de plus de 24 mensualités est réservé à des cas spéciaux documentés au sein de votre organisme.'
      }
    }
  },
  docxSkillIds: ['replies'],
  about: { prompt: 'synthèse' },
  automations: { prompt: 'rapport', timezone: 'Europe/Paris' },
  chatbot: true
}

export function loadCustomizationFixture(patch?: Partial<InstanceCustomization>) {
  loadCustomization({ ...CUSTOMIZATION_FIXTURE, ...patch })
}
