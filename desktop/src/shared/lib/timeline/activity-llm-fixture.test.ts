import { describe, expect, test } from 'bun:test'

import {
  parse_case_change_content,
  parse_communication_opened_content,
  parse_communication_status_content,
  parse_signature_content,
  parse_task_content,
  parse_titled_content,
  type Activite,
  type ActivityType,
  type CommunicationChannel
} from '@/shared/types/activites'

import { projectTimelineItems } from './project-timeline'

function row(
  id: number,
  type: ActivityType,
  contenu: Record<string, unknown>,
  extra: Partial<Activite> = {}
): Activite {
  return {
    id,
    date_creation: `2026-06-10T1${id}:00:00Z`,
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@exemple.fr',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: 'LOT-1',
    type,
    channel: extra.channel ?? null,
    mentions: [],
    contenu: JSON.stringify(contenu),
    thread_id: extra.thread_id ?? null,
    revision: extra.revision ?? null,
    ...extra
  }
}

const fixture: Activite[] = [
  row(1, 'case.group_changed', { version: 2, before: 'non_traites', after: 'amiable' }),
  row(2, 'case.assignee_changed', {
    version: 2,
    before: null,
    after: { id: 'user:bob@exemple.fr', label: 'Bob' }
  }),
  row(3, 'case.tags_changed', { version: 2, before: [], after: ['relance', 'plan'] }),
  row(
    4,
    'task.created',
    {
      version: 2,
      task: {
        title: 'Appeler le locataire',
        state: 'open',
        assignee: { id: 'user:bob@exemple.fr', label: 'Bob' }
      }
    },
    { thread_id: 'task-1', revision: 1 }
  ),
  row(
    5,
    'task.completed',
    { version: 2, task: { title: 'Vérifier le solde', state: 'completed' } },
    { thread_id: 'task-2', revision: 1 }
  ),
  row(
    6,
    'communication.sent',
    { version: 2, sender: 'Alice', subject: 'Relance', body: 'Merci de régulariser.' },
    { thread_id: 'mail-1', revision: 1, channel: 'email' as CommunicationChannel }
  ),
  row(
    7,
    'communication.ok',
    { version: 2, result: 'read' },
    { thread_id: 'mail-1', revision: 2, channel: 'email' as CommunicationChannel }
  ),
  row(8, 'repayment_plan.finalized', { version: 2, title: 'Plan d’apurement' }),
  row(
    9,
    'document.sent_for_signature',
    {
      version: 2,
      document: { id: 'doc-1', type: 'plan', title: 'Plan d’apurement', version: '1' },
      signers: [
        { id: 'jean', label: 'Jean', status: 'pending' },
        { id: 'lea', label: 'Léa', status: 'pending' }
      ]
    },
    { thread_id: 'sign-1', revision: 1, channel: 'email' as CommunicationChannel }
  ),
  row(
    10,
    'document.signed',
    {
      version: 2,
      document: { id: 'doc-1', type: 'plan', title: 'Plan d’apurement', version: '1' },
      signers: [
        { id: 'jean', label: 'Jean', status: 'signed' },
        { id: 'lea', label: 'Léa', status: 'pending' }
      ],
      signer: { id: 'jean', label: 'Jean' }
    },
    { thread_id: 'sign-1', revision: 2 }
  )
]

describe('LLM fixture', () => {
  test('lit le dossier sans heuristique', () => {
    const latest = <T>(type: ActivityType, parse: (raw: string) => T | null) => {
      const found = [...fixture].reverse().find((item) => item.type === type)
      return found ? parse(found.contenu) : null
    }

    expect(latest('case.group_changed', parse_case_change_content)?.after).toBe('amiable')
    expect(latest('case.assignee_changed', parse_case_change_content)?.after).toEqual({
      id: 'user:bob@exemple.fr',
      label: 'Bob'
    })
    expect(latest('case.tags_changed', parse_case_change_content)?.after).toEqual([
      'relance',
      'plan'
    ])

    const tasks = fixture
      .filter((item) => item.type.startsWith('task.'))
      .map((item) => parse_task_content(item.contenu))
    expect(tasks.map((task) => task?.task.state)).toEqual(['open', 'completed'])

    const sent = fixture.find((item) => item.type === 'communication.sent')!
    expect(sent.channel).toBe('email')
    expect(parse_communication_opened_content(sent.contenu)?.body).toBe('Merci de régulariser.')
    const status = fixture.find((item) => item.type === 'communication.ok')!
    expect(parse_communication_status_content(status.contenu)?.result).toBe('read')

    expect(latest('repayment_plan.finalized', parse_titled_content)?.title).toBe('Plan d’apurement')

    const sentDoc = fixture.find((item) => item.type === 'document.sent_for_signature')!
    const signed = fixture.find((item) => item.type === 'document.signed')!
    expect(
      parse_signature_content(sentDoc.contenu)?.signers.map((signer) => signer.status)
    ).toEqual(['pending', 'pending'])
    expect(parse_signature_content(signed.contenu)?.signers.map((signer) => signer.status)).toEqual(
      ['signed', 'pending']
    )
  })

  test('regroupe seulement les statuts de communication', () => {
    const projected = projectTimelineItems(fixture)
    expect(projected.filter((item) => item.kind === 'communication')).toHaveLength(1)
    expect(projected.find((item) => item.kind === 'communication')?.statuses).toHaveLength(1)
    expect(projected.some((item) => item.row.type === 'communication.ok')).toBe(false)
    expect(projected.filter((item) => item.row.type.startsWith('document.'))).toHaveLength(2)
  })

  test('attache les statuts seulement à l’envoi lorsque le thread contient une réception', () => {
    const projected = projectTimelineItems([
      row(
        20,
        'communication.sent',
        { version: 2, sender: 'Alice', body: 'Question' },
        { thread_id: 'shared-thread', revision: 1, channel: 'rcs' }
      ),
      row(
        21,
        'communication.received',
        { version: 2, sender: 'Locataire', body: 'Réponse' },
        { thread_id: 'shared-thread', revision: 2, channel: 'rcs' }
      ),
      row(
        23,
        'communication.imported',
        { version: 2, sender: 'Locataire', body: 'Historique importé' },
        { thread_id: 'shared-thread', revision: 2, channel: 'email' }
      ),
      row(
        22,
        'communication.ok',
        { version: 2, result: 'delivered' },
        { thread_id: 'shared-thread', revision: 3, channel: 'rcs' }
      )
    ])

    const sent = projected.find((item) => item.row.id === 20)
    expect(sent?.kind).toBe('communication')
    if (sent?.kind === 'communication') {
      expect(sent.statuses.map((status) => status.id)).toEqual([22])
    }
    expect(projected.find((item) => item.row.id === 21)?.kind).toBe('event')
    expect(projected.find((item) => item.row.id === 23)?.kind).toBe('event')
  })

  test('ordonne la progression par révision puis id avant l’horodatage', () => {
    const projected = projectTimelineItems([
      row(
        30,
        'communication.sent',
        { version: 2, sender: 'Alice', body: 'Relance' },
        { thread_id: 'mail-order', revision: 1, channel: 'email' }
      ),
      row(
        33,
        'communication.ok',
        { version: 2, result: 'delivered' },
        {
          thread_id: 'mail-order',
          revision: 2,
          date_creation: '2026-06-10T12:00:00Z',
          channel: 'email'
        }
      ),
      row(
        32,
        'communication.ok',
        { version: 2, result: 'delivered' },
        {
          thread_id: 'mail-order',
          revision: 2,
          date_creation: '2026-06-10T12:00:00Z',
          channel: 'email'
        }
      ),
      row(
        31,
        'communication.ok',
        { version: 2, result: 'read' },
        {
          thread_id: 'mail-order',
          revision: 3,
          date_creation: '2026-06-10T11:00:00Z',
          channel: 'email'
        }
      )
    ])

    const sent = projected.find((item) => item.row.id === 30)
    expect(sent?.kind).toBe('communication')
    if (sent?.kind === 'communication') {
      expect(sent.statuses.map((status) => status.id)).toEqual([32, 33, 31])
      expect(parse_communication_status_content(sent.statuses.at(-1)!.contenu)?.result).toBe('read')
    }
  })
})
