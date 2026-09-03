import { describe, expect, it, mock } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

mock.module('@/contexts/UiSettingsContext', () => ({
  useUiSettings: () => ({
    settings: { mascot: { shape: 'galet', color: '#5b8c5a' } }
  }),
  useResolvedUiSettings: () => ({
    mascot: { shape: 'galet', color: '#5b8c5a' }
  })
}))

mock.module('@/features/repayment/lib/outbound-email-templates.bundle', () => ({
  listOutboundTemplateGroups: () => [],
  listOutboundTemplates: () => [],
  resolveOutboundEmail: () => null,
  resolveOutboundRcs: () => null
}))

import { ContextTimeline } from '@/shared/components/timeline/context-timeline'
import { parseActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import type { Activite } from '@/shared/types/activites'

import { RepaymentActivityTimelineEvent } from './RepaymentActivityTimelineEvent'

function row(overrides: Partial<Activite> = {}): Activite {
  return {
    id: 1,
    date_creation: '2026-08-21T10:00:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@example.test',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'note.published',
    channel: null,
    mentions: [],
    contenu: JSON.stringify({ version: 2, text: 'Relance' }),
    ...overrides
  }
}

function renderEvent(activity: Activite) {
  return renderToStaticMarkup(
    <ContextTimeline>
      <RepaymentActivityTimelineEvent
        row={activity}
        actor={parseActivityAuthor(activity.auteur)}
        step={1}
        dateTime={activity.date_creation}
        dateLabel="21/08/2026 · 10h00"
      />
    </ContextTimeline>
  )
}

describe('ActivityTimelineEvent', () => {
  it('rend une note comme la frise Inspector', () => {
    const html = renderEvent(row())
    expect(html).toContain('data-slot="timeline-separator"')
    expect(html).toContain('21/08/2026 · 10h00')
    expect(html).toContain('a laissé une note')
    expect(html).toContain('Relance')
  })

  it('formule un changement de groupe avec les chips Inspector', () => {
    const html = renderEvent(
      row({
        type: 'case.group_changed',
        contenu: JSON.stringify({
          version: 2,
          before: 'amiable',
          after: 'pre_contentieux',
          note: 'Échec des relances amiables.'
        })
      })
    )
    expect(html).toContain('a déplacé le dossier de groupe')
    expect(html).toContain('amiable')
    expect(html).toContain('pre_contentieux')
    expect(html).toContain('Échec des relances amiables.')
  })

  it('formule une tâche créée avec chips titre / responsable / échéance', () => {
    const html = renderEvent(
      row({
        type: 'task.created',
        thread_id: 'todo-1',
        revision: 1,
        contenu: JSON.stringify({
          version: 2,
          task: {
            title: 'Analyser un rejet',
            state: 'open',
            assignee: { id: 'user:gregoire@exemple.fr', label: 'Grégoire' },
            due_date: '2026-08-28'
          }
        })
      })
    )
    expect(html).toContain('a créé')
    expect(html).toContain('Analyser un rejet')
    expect(html).toContain('Assignée à')
  })

  it('rend un événement de réaction sans afficher le type technique', () => {
    const html = renderEvent(
      row({
        auteur: 'user:bob@example.test',
        type: 'activity.reaction_changed',
        contenu: JSON.stringify({
          version: 2,
          source_activity_id: 42,
          emoji: '👍'
        })
      })
    )
    expect(html).toMatch(/Bob|bob@example\.test/)
    expect(html).toContain('a mis à jour une activité')
    expect(html).not.toContain('activity.reaction_changed')
    expect(html).toContain('21/08/2026 · 10h00')
  })
})
