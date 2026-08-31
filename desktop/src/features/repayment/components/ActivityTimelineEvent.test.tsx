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

import { ActivityTimelineEvent } from './ActivityTimelineEvent'

function row(overrides: Partial<Activite> = {}): Activite {
  return {
    id: 1,
    date_creation: '2026-08-21T10:00:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:alice@example.test',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    type: 'note',
    statut: 'logged',
    mentions: [],
    contenu: JSON.stringify({ version: 1, note: 'Relance' }),
    ...overrides
  }
}

function renderEvent(activity: Activite) {
  return renderToStaticMarkup(
    <ContextTimeline>
      <ActivityTimelineEvent
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
        type: 'repayment_phase_change',
        contenu: JSON.stringify({
          version: 1,
          phase_precedente: 'amiable',
          phase: 'pre_contentieux',
          note: 'Échec des relances amiables.'
        })
      })
    )
    expect(html).toContain('a déplacé le dossier du groupe')
    expect(html).toContain('Recouvrement amiable')
    expect(html).toContain('Précontentieux')
    expect(html).toContain('Échec des relances amiables.')
  })

  it('formule une tâche créée avec chips titre / responsable / échéance', () => {
    const html = renderEvent(
      row({
        type: 'action',
        event: 'created',
        state: 'a_faire',
        thread_id: 'todo-1',
        revision: 1,
        contenu: JSON.stringify({
          version: 1,
          action: 'Analyser un rejet',
          etat: 'a_faire',
          cree_par: 'user:alice@example.test',
          cree_le: '2026-08-21T10:00:00',
          assigne_a: 'user:gregoire@exemple.fr',
          date_echeance: '2026-08-28'
        })
      })
    )
    expect(html).toContain('a créé')
    expect(html).toContain('Analyser un rejet')
    expect(html).toContain('assignée à')
  })

  it('nomme l’objet boosté sans afficher le type technique', () => {
    const html = renderEvent(
      row({
        auteur: 'user:bob@example.test',
        type: 'activity_boost',
        contenu: JSON.stringify({
          version: 1,
          activite_source_id: 42,
          type_activite_source: 'note',
          emoji: '👍'
        })
      })
    )
    expect(html).toContain('bob@example.test')
    expect(html).toContain('a boosté une note 👍')
    expect(html).not.toContain('activity_boost')
    expect(html).toContain('21/08/2026 · 10h00')
  })
})
