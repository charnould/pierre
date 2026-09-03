import { describe, expect, mock, test } from 'bun:test'

import { parse_repayment_plan_content } from '@/shared/types/activites'

import {
  createAdultMember,
  createAmountLine,
  createDefaultApurementPlanForm
} from './apurement-plan/defaults'
import { PLAN_TYPE_LABELS } from './apurement-plan/types'
import {
  buildPlanContenu,
  repaymentPlanFormToSnapshot,
  repaymentPlanSnapshotToForm,
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
    const contenu = buildPlanContenu(form, comment)
    const parsed = parse_repayment_plan_content('repayment_plan.created', contenu)
    expect(parsed).toMatchObject({
      version: 2,
      title: PLAN_TYPE_LABELS[form.planType],
      note: 'Commentaire existant',
      plan: { debt: { amount: 200 } }
    })
    expect(parsed).not.toHaveProperty('calculs')
    expect(parsed).not.toHaveProperty('resume')
  })

  test('convertit le formulaire sans perte métier ni ids de lignes UI', () => {
    const form = createDefaultApurementPlanForm()
    const adult = createAdultMember({ firstName: 'Alice' })
    form.household.adults = [adult]
    form.income = [
      createAmountLine({
        label: 'Revenu personnalisé',
        amount: 1_250,
        custom: true,
        personId: adult.id
      })
    ]
    form.hasSocialWorker = true
    form.socialWorkerName = ''
    form.socialWorkerOrganization = ''

    const snapshot = repaymentPlanFormToSnapshot(form)
    expect(snapshot.social_worker).toEqual({ name: '', organization: '' })
    expect(snapshot.budget.income[0]).toEqual({
      label: 'Revenu personnalisé',
      amount: 1_250,
      person_id: adult.id
    })
    expect(snapshot.budget.income[0]).not.toHaveProperty('id')
    expect(snapshot.budget.income[0]).not.toHaveProperty('custom')

    const restored = repaymentPlanSnapshotToForm(snapshot, false)
    expect(restored.hasSocialWorker).toBe(true)
    expect(restored.income[0]).toMatchObject({
      label: 'Revenu personnalisé',
      amount: 1_250,
      custom: true,
      personId: adult.id
    })
    expect(restored.household.adults[0]?.id).toBe(adult.id)
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
