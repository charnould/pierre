import { beforeEach, describe, expect, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import type { TenantRepaymentRow } from './classify-tenants'
import {
  pierreArtifactTitle,
  pierreMissionContext,
  repaymentTagsAfter,
  runRepaymentBulk
} from './repayment-bulk-action'

const row = (id: string, tags: string[] = [], statut?: string): TenantRepaymentRow => ({
  id_locataire: id,
  id_client: `CLI-${id}`,
  solde_locataire: 100,
  repayment_tags: tags,
  ...(statut ? { statut } : {})
})

describe('repayment bulk action', () => {
  beforeEach(() => {
    loadCustomizationFixture()
  })

  test('ajoute ou retire un tag sans remplacer les autres', () => {
    expect(repaymentTagsAfter(['décès'], 'add', '+65 ans')).toEqual(['décès', '+65 ans'])
    expect(repaymentTagsAfter(['décès', '+65 ans'], 'remove', 'décès')).toEqual(['+65 ans'])
  })

  test('continue après un dossier parti et conserve la phase déjà écrite', async () => {
    const written: string[] = []
    const phases = new Map<string, string>()
    const result = await runRepaymentBulk({
      ids: ['LOC-1', 'LOC-2', 'LOC-3'],
      action: { kind: 'phase', phase: 'Amiable' },
      rows: [row('LOC-1'), row('LOC-2', [], 'ex-client'), row('LOC-3')],
      getBucket: () => 'Non traités',
      setBucket: (id, phase) => phases.set(id, phase),
      clearBucket: (id) => phases.delete(id),
      generatedBy: 'alice',
      shouldStop: () => false,
      onProgress: () => {},
      writeActivity: async (activity) => {
        written.push(activity.ref)
        return true
      },
      generate: async () => null
    })

    expect(written).toEqual(['LOC-1', 'LOC-3'])
    expect(result.succeeded).toEqual(['LOC-1', 'LOC-3'])
    expect(result.failed).toEqual(['LOC-2'])
    expect(result.stopped).toBe(false)
    expect(phases.get('LOC-1')).toBe('Amiable')
  })

  test('enregistre la mission de Pierre sans l’envoyer', async () => {
    const result = await runRepaymentBulk({
      ids: ['LOC-1'],
      action: { kind: 'pierre', mission: 'synthese', instruction: '' },
      rows: [row('LOC-1')],
      getBucket: () => 'Non traités',
      setBucket: () => {},
      clearBucket: () => {},
      generatedBy: 'alice',
      shouldStop: () => false,
      onProgress: () => {},
      writeActivity: async (activity) => {
        expect(activity.type).toBe('artifact.generated')
        expect(activity.contenu).toContain(pierreArtifactTitle('synthese'))
        expect(activity.contenu).toContain('Le solde reste ouvert.')
        return true
      },
      generate: async (_id, mission) => {
        expect(mission).toBe(
          pierreMissionContext({ kind: 'pierre', mission: 'synthese', instruction: '' })
        )
        return 'Le solde reste ouvert.'
      }
    })

    expect(result).toEqual({ succeeded: ['LOC-1'], failed: [], stopped: false })
  })
})
