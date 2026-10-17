import { beforeAll, describe, expect, mock, test } from 'bun:test'

import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'
import { parse_repayment_plan_content } from '@/shared/types/activites'

import {
  createAdultMember,
  createAmountLine,
  createDefaultRepaymentPlanForm
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
  beforeAll(() => {
    loadCustomizationFixture()
  })

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
    const form = createDefaultRepaymentPlanForm()
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
    const form = createDefaultRepaymentPlanForm()
    const adult = createAdultMember({ firstName: 'Alice' })
    form.household.adults = [adult]
    form.income = [
      createAmountLine({
        label: 'Revenu personnalisé',
        amount: 1_250,
        custom: true,
        personId: adult.id,
        month: '2026-11'
      })
    ]
    form.hasSocialWorker = true
    form.socialWorkerName = ''
    form.socialWorkerOrganization = ''
    form.socialWorkerContact = '06 00 00 00 00'
    form.idLot = 'LOT-1'
    form.household.adults[0]!.employmentStatus = 'student'
    form.household.adults[0]!.employer = 'Grand Dijon Habitat'
    form.household.adults[0]!.isOccupant = false

    const snapshot = repaymentPlanFormToSnapshot(form)
    expect(snapshot.address.idLot).toBe('LOT-1')
    expect(snapshot.socialWorker).toEqual({
      name: '',
      organization: '',
      contact: '06 00 00 00 00',
      lastContactDate: ''
    })
    expect(snapshot.household.adults[0]?.employmentStatus).toBe('student')
    expect(snapshot.household.adults[0]?.employer).toBe('Grand Dijon Habitat')
    expect(snapshot.household.adults[0]?.occupant).toBe(false)
    expect(snapshot.household.adults[0]).not.toHaveProperty('pension_fund')
    expect(snapshot.budget.income[0]).toEqual({
      label: 'Revenu personnalisé',
      amount: 1_250,
      personId: adult.id,
      month: '2026-11'
    })
    expect(snapshot.budget.income[0]).not.toHaveProperty('id')
    expect(snapshot.budget.income[0]).not.toHaveProperty('custom')

    const restored = repaymentPlanSnapshotToForm(snapshot, false)
    expect(restored.hasSocialWorker).toBe(true)
    expect(restored.idLot).toBe('LOT-1')
    expect(restored.socialWorkerContact).toBe('06 00 00 00 00')
    expect(restored.household.adults[0]?.employmentStatus).toBe('student')
    expect(restored.household.adults[0]?.employer).toBe('Grand Dijon Habitat')
    expect(restored.household.adults[0]?.isOccupant).toBe(false)
    expect(restored.income[0]).toMatchObject({
      label: 'Revenu personnalisé',
      amount: 1_250,
      custom: true,
      personId: adult.id,
      month: '2026-11'
    })
    expect(restored.household.adults[0]?.id).toBe(adult.id)
  })

  test('rejette un mois de ressource invalide', () => {
    const form = createDefaultRepaymentPlanForm()
    form.income = [createAmountLine({ label: 'Salaire(s) net(s)', amount: 1000, month: '2026-08' })]
    const parsed = JSON.parse(buildPlanContenu(form, '')) as {
      plan: { budget: { income: Array<{ month?: string }> } }
    }
    parsed.plan.budget.income[0]!.month = '2026-13'
    expect(
      parse_repayment_plan_content('repayment_plan.created', JSON.stringify(parsed))
    ).toBeNull()
  })

  test('rejette un snapshot sans identifiant de patrimoine', () => {
    const contenu = buildPlanContenu(createDefaultRepaymentPlanForm(), '')
    const parsed = JSON.parse(contenu) as { plan: { address: { idLot?: string } } }
    delete parsed.plan.address.idLot
    expect(
      parse_repayment_plan_content('repayment_plan.created', JSON.stringify(parsed))
    ).toBeNull()
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
