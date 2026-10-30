import { writeSetup } from '../utils/setup-store'

const text = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
const agents = (body: string) => new TextEncoder().encode(body)

export const repaymentSchedule = {
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
}

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
      create_plan: { schedule: repaymentSchedule }
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
