import { describe, expect, test } from 'bun:test'

import { createDefaultApurementPlanForm } from './apurement-plan/defaults'
import {
  createExportOnlyPlanEditorRequest,
  createExportOnlyPlanTenant,
  planWorkspaceFooterVisibility
} from './repayment-plan-export-only'

describe('createExportOnlyPlanEditorRequest', () => {
  test('ouvre un plan export-only avec un tenant synthétique vide', () => {
    expect(createExportOnlyPlanEditorRequest()).toEqual({
      tenant: { id_locataire: '', id_client: '', solde_locataire: 0 },
      exportOnly: true
    })
  })

  test('le formulaire par défaut accepte le tenant synthétique', () => {
    const form = createDefaultApurementPlanForm(createExportOnlyPlanTenant())
    expect(form.rentalDebt).toBe(0)
    expect(form.address).toBe('')
    expect(form.idLocataire).toBe('')
    expect(form.idClient).toBe('')
    expect(form.installments.length).toBeGreaterThan(0)
  })
})

describe('planWorkspaceFooterVisibility', () => {
  test('export-only : seul l’export reste visible', () => {
    expect(planWorkspaceFooterVisibility(true, false, false)).toEqual({
      showDelete: false,
      showClose: false,
      showExport: true,
      showSave: false
    })
    expect(planWorkspaceFooterVisibility(true, true, false)).toEqual({
      showDelete: false,
      showClose: false,
      showExport: true,
      showSave: false
    })
  })

  test('mode normal : save visible, delete/close selon activity', () => {
    expect(planWorkspaceFooterVisibility(false, false, false)).toEqual({
      showDelete: false,
      showClose: false,
      showExport: true,
      showSave: true
    })
    expect(planWorkspaceFooterVisibility(false, true, false)).toEqual({
      showDelete: true,
      showClose: false,
      showExport: true,
      showSave: true
    })
    expect(planWorkspaceFooterVisibility(false, true, true)).toEqual({
      showDelete: false,
      showClose: true,
      showExport: true,
      showSave: false
    })
  })
})
