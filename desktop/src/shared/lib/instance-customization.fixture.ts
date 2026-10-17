import { loadCustomization, type InstanceCustomization } from '@/shared/lib/instance-customization'

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
    buckets: [
      { id: 'non_traites', label: 'Non traités' },
      { id: 'amiable', label: 'Recouvrement amiable' },
      { id: 'contentieux', label: 'Contentieux' },
      { id: 'clients_partis', label: 'Clients partis' }
    ],
    actions: {
      dossier: ['Analyser le dossier', 'Joindre le locataire'],
      bulk_operations: ['Envoyer un RCS de relance']
    },
    tags: ['décès', '+65 ans'],
    template_groups: ['RCS/SMS au (ex-)client'],
    create_plan: {
      signedBucketId: 'amiable',
      schedule: {
        defaultMonths: 6,
        maxEffortRate: 35,
        minDailyRemainder: 15,
        thresholds: [
          { months: 12, message: 'Un échéancier de plus de 12 mensualités doit être confirmé.' },
          {
            months: 24,
            message:
              'Un plan d’apurement de plus de 24 mensualités est réservé à des cas spéciaux documentés au sein de votre organisme.'
          }
        ]
      },
      close: {
        execution_complete: { bucketId: 'non_traites' },
        non_respect: { bucketId: 'contentieux' },
        remplacement_par_nouveau_plan: { bucketId: 'amiable' },
        effacement_de_dette: { bucketId: 'non_traites' }
      }
    },
    templates: {}
  },
  docxSkillIds: ['replies'],
  about: { prompt: 'synthèse' },
  automations: { prompt: 'rapport', timezone: 'Europe/Paris' },
  chatbot: true
}

export function loadCustomizationFixture(patch?: Partial<InstanceCustomization>) {
  loadCustomization({ ...CUSTOMIZATION_FIXTURE, ...patch })
}
