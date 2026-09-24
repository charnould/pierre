import { writeSetup } from '../utils/setup-store'

const text = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
const agents = (body: string) => new TextEncoder().encode(body)

/** Lignes minimales pour les tests qui exercent un module déjà paramétré. */
export async function seedInstanceSetup(): Promise<void> {
  await writeSetup('global', text({ name: 'PIERRE', timezone: 'Europe/Paris' }))
  await writeSetup('email/html', agents('{{ logo_inline_cid }} {{ message }}'))
  await writeSetup('email/logo.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))
  await writeSetup('about/AGENTS.md', agents('Synthèse.'))
  await writeSetup('automations/AGENTS.md', agents('Rapport.'))
  await writeSetup(
    'tickets',
    text({
      buckets: [{ id: 'non_traitees', label: 'Réclamations' }],
      actions: { dossier: ['Analyser le dossier'] },
      tags: ['Urgent']
    })
  )
  await writeSetup('tickets/AGENTS.md', agents('Répondre.'))
  await writeSetup('tickets/letter.docx', docx)
  await writeSetup(
    'repayment',
    text({
      buckets: [
        { id: 'non_traites', label: 'Non traités' },
        { id: 'amiable', label: 'Amiable' },
        { id: 'clients_partis', label: 'Partis' }
      ],
      actions: {
        dossier: ['Analyser le dossier'],
        bulk_operations: ['Envoyer un RCS de relance']
      },
      tags: ['décès', '+65 ans', 'Redémarrage APL'],
      template_groups: ['RCS'],
      templates: ['note.md'],
      create_plan: {
        signed_bucket_id: 'amiable',
        close: {
          execution_complete: { bucket_id: 'non_traites' },
          non_respect: { bucket_id: 'amiable' },
          remplacement_par_nouveau_plan: { bucket_id: 'amiable' },
          effacement_de_dette: { bucket_id: 'non_traites' }
        }
      }
    })
  )
  await writeSetup('repayment/AGENTS.md', agents('Impayés.'))
  await writeSetup('repayment/template.docx', docx)
  await writeSetup('repayment/templates/note.md', agents('Bonjour.'))
  await writeSetup(
    'chatbots/default',
    text({
      id: 'default',
      display: 'PIERRE',
      enabled: true,
      community_knowledge: true,
      reasoning_effort: 'medium',
      trace: 'none',
      attachments: false,
      greetings: ['Bonjour'],
      examples: ['Question'],
      disclaimer: 'Vérifier.'
    })
  )
  await writeSetup('chatbots/default/AGENTS.md', agents('Agent.'))
  await writeSetup(
    'chatbots/icons/icon.svg',
    new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"></svg>'
    )
  )
}
