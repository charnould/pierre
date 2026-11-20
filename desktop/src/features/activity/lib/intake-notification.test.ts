import { describe, expect, it, mock } from 'bun:test'

import {
  activityRowContextLabel,
  activitySenderLabel,
  moduleLabelForType
} from '@/features/activity/lib/notification-labels'
import { activityToTarget, mapActivityRow } from '@/features/activity/lib/notification-types'
import { openActivityNotification } from '@/features/activity/lib/open-notification'
import { readerTargetFromNotification } from '@/features/activity/lib/reader-target'
import type { ActivityListItem } from '@/shared/types/activities'

const sampleRow = (contenu: string): ActivityListItem => ({
  id: 42,
  createdAt: '2026-11-22T10:00:00Z',
  rattachement: 'intake:0198f1a0-7b6c-7000-8000-000000000999',
  auteur: 'intake:0198f1a0-7b6c-7000-8000-000000000999',
  destinataire: null,
  id_client: null,
  id_locataire: null,
  id_lot: null,
  type: 'intake.submitted',
  channel: null,
  mentions: [{ destinataire: 'user:alice@example.org' }],
  contenu,
  my: null,
  read: false,
  reaction: null
})

describe('intake activity notifications', () => {
  it('maps intake.submitted activity rows into reader notifications without polluting ActivityTarget', () => {
    const row = sampleRow(
      JSON.stringify({
        version: 1,
        title: 'Demande de travaux',
        submissionId: 'sub-1',
        values: { Nom: 'Dupont', Urgence: 'Haute' },
        files: [
          {
            field: 'pieces_jointes',
            filename: 'devis.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1200
          }
        ]
      })
    )

    expect(activityToTarget(row)).toBeNull()

    const mapped = mapActivityRow(row, 'Collectes', moduleLabelForType('intake'))
    expect(mapped.type).toBe('intake')
    expect(mapped.target).toBeNull()
    expect(mapped.moduleLabel).toBe('Collectes')
    expect(mapped.intakeContent?.submissionId).toBe('sub-1')
    expect(mapped.intakeContent?.files).toHaveLength(1)
    expect(activitySenderLabel(mapped)).toBe('Collecte')
    expect(activityRowContextLabel(mapped)).toBe('Collectes · Demande de travaux')

    const expectedReader = {
      kind: 'intake' as const,
      intakeId: '0198f1a0-7b6c-7000-8000-000000000999',
      title: 'Demande de travaux',
      date: '2026-11-22T10:00:00Z',
      content: mapped.intakeContent!
    }
    expect(readerTargetFromNotification(mapped)).toEqual(expectedReader)

    const openReader = mock(() => {})
    const openContextTarget = mock(() => {})
    const markItemRead = mock(() => {})
    openActivityNotification(mapped, { openReader, openContextTarget, markItemRead })
    expect(openReader).toHaveBeenCalledWith(expectedReader)
    expect(openContextTarget).not.toHaveBeenCalled()
    expect(markItemRead).toHaveBeenCalledWith(42)
  })
})
