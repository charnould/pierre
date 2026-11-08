import { REPAYMENT_DOCUMENT_IDS, writeSetup } from '../utils/setup-store'

const text = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))
const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
const agents = (body: string) => new TextEncoder().encode(body)

export const repaymentSchedule = {
  defaultInstallments: 6,
  maxEffortPercent: 35,
  minDailyRemainderEuros: 15,
  confirmAfterInstallments: {
    '12': 'Un échéancier de plus de 12 mensualités doit être confirmé.',
    '24': 'Un plan d’apurement de plus de 24 mensualités est réservé à des cas spéciaux documentés au sein de votre organisme.'
  }
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
      phases: ['Non traités', 'Amiable', 'Partis'],
      caseActions: ['Analyser le dossier'],
      batchActions: [
        'Envoyer un RCS de relance',
        'Relancer',
        'Relancer par SMS',
        'RCS',
        'RCS bis',
        'Courriel',
        'R1'
      ],
      tags: ['décès', '+65 ans', 'Redémarrage APL'],
      schedule: repaymentSchedule
    })
  )
  await writeSetup('repayment/AGENTS.md', agents('Impayés.'))
  for (const id of REPAYMENT_DOCUMENT_IDS) await writeSetup(id, docx)
  await writeSetup(
    'repayment/messages',
    text([
      JSON.stringify({
        group: 'RCS',
        action: 'Relancer',
        label: 'Relance',
        body: 'Bonjour.',
        choices: []
      })
    ])
  )
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
