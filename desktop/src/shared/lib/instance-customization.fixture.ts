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
      signed_bucket_id: 'amiable',
      close: {
        execution_complete: { bucket_id: 'non_traites' },
        non_respect: { bucket_id: 'contentieux' },
        remplacement_par_nouveau_plan: { bucket_id: 'amiable' },
        effacement_de_dette: { bucket_id: 'non_traites' }
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
