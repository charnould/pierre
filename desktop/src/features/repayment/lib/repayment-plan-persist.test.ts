import { describe, expect, mock, test } from 'bun:test'

import { createDefaultApurementPlanForm } from './apurement-plan/defaults'
import { PLAN_TYPE_LABELS } from './apurement-plan/types'
import {
  buildPlanContenu,
  resolvePlanComment,
  resolvePlanPersistMode,
  shouldApplyPlanAdvancement
} from './repayment-plan-persist'

describe('repayment plan persist routing', () => {
  test('create sans activityId, patch avec activityId', () => {
    expect(resolvePlanPersistMode(undefined)).toBe('create')
    expect(resolvePlanPersistMode(1)).toBe('patch')
  })

  test('applique l’avancement à la création et aux bascules signed', () => {
    expect(shouldApplyPlanAdvancement(undefined, null, false)).toBe(true)
    expect(shouldApplyPlanAdvancement(1, false, false)).toBe(false)
    expect(shouldApplyPlanAdvancement(1, false, true)).toBe(true)
    expect(shouldApplyPlanAdvancement(1, true, false)).toBe(true)
  })

  test('conserve le commentaire sur réenregistrement sans dialog', () => {
    const form = createDefaultApurementPlanForm()
    form.rentalDebt = 200
    const savedComment = 'Commentaire existant'
    const commentaireFromSaveButton: string | undefined = undefined
    const comment = resolvePlanComment(commentaireFromSaveButton, savedComment)
    const contenu = buildPlanContenu(form, 'LOC-1', comment)
    const parsed = JSON.parse(contenu) as {
      version: number
      titre: string
      etat: string
      note?: string
      formulaire: { rentalDebt: number }
      calculs: unknown
      resume: { mensualite: number; nombre_echeances: number; montant_total: number }
    }
    expect(parsed.version).toBe(1)
    expect(parsed.titre).toBe(PLAN_TYPE_LABELS[form.planType])
    expect(parsed.etat).toBe('brouillon')
    expect(parsed.note).toBe('Commentaire existant')
    expect(parsed.formulaire.rentalDebt).toBe(200)
    expect(parsed.resume.montant_total).toBe(200)
    expect(parsed.calculs).toBeDefined()
  })

  test('createActivity vs patchActivity selon le mode', async () => {
    const createActivity = mock(async (_body: object) => ({ data: { id: 2 } }))
    const patchActivity = mock(async (_body: object) => ({ data: { id: 1 } }))

    async function persist(existingActivityId?: number) {
      const mode = resolvePlanPersistMode(existingActivityId)
      if (mode === 'patch' && existingActivityId) {
        return patchActivity({ id: existingActivityId })
      }
      return createActivity({})
    }

    await persist()
    expect(createActivity).toHaveBeenCalledTimes(1)
    expect(patchActivity).toHaveBeenCalledTimes(0)

    await persist(1)
    expect(createActivity).toHaveBeenCalledTimes(1)
    expect(patchActivity).toHaveBeenCalledTimes(1)
  })
})
