import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderDocxTemplate } from '@/features/workflow/lib/generate-docx'

import { createExportOnlyPlanTenant } from '../repayment-plan-export-only'
import { buildPlanDocxData } from './build-plan-docx-data'
import {
  createAdultMember,
  createAidItem,
  createAmountLine,
  createChildMember,
  createDefaultApurementPlanForm
} from './defaults'
import { generatePlanDocxFilename, resolvePlanExportIds } from './export-plan-docx'

const TEMPLATE_PATH = join(
  import.meta.dir,
  '../../../../../..',
  'customization',
  'repayments',
  'templates',
  'template.docx'
)

describe('generatePlanDocxFilename', () => {
  const now = new Date('2026-07-31T12:00:00')

  test('inclut date, id_client, CAF et type de plan', () => {
    const form = createDefaultApurementPlanForm()
    form.planType = 'repayment_plan'
    form.household.adults = [
      createAdultMember({
        firstName: 'Marcel',
        lastName: 'Droitier',
        cafNumber: '39929F999C',
        isLeaseHolder: true
      })
    ]
    expect(generatePlanDocxFilename(form, 'CLI-42', now)).toBe(
      "2026-07-31 - CLI-42/39929F999C - Plan d'apurement"
    )
  })

  test('utilise le libellé protocole de cohésion sociale', () => {
    const form = createDefaultApurementPlanForm()
    form.planType = 'social_cohesion_protocol'
    form.household.adults = [createAdultMember({ cafNumber: 'CAF-1', isLeaseHolder: true })]
    expect(generatePlanDocxFilename(form, 'CLI-1', now)).toBe(
      '2026-07-31 - CLI-1/CAF-1 - Protocole de cohésion sociale'
    )
  })
})

describe('resolvePlanExportIds', () => {
  test('préfère les ids du formulaire', () => {
    const form = createDefaultApurementPlanForm({
      id_locataire: 'FORM-LOC',
      id_client: 'FORM-CLI',
      solde_locataire: 0
    })
    expect(
      resolvePlanExportIds(form, { id_locataire: 'TENANT-LOC', id_client: 'TENANT-CLI' })
    ).toEqual({
      id_locataire: 'FORM-LOC',
      id_client: 'FORM-CLI'
    })
  })

  test('repli sur le tenant si le formulaire est vide', () => {
    const form = createDefaultApurementPlanForm(createExportOnlyPlanTenant())
    expect(
      resolvePlanExportIds(form, { id_locataire: 'TENANT-LOC', id_client: 'TENANT-CLI' })
    ).toEqual({
      id_locataire: 'TENANT-LOC',
      id_client: 'TENANT-CLI'
    })
  })
})

describe('export plan docx template', () => {
  test('rend le template GDH sans erreur ni TODO restant', async () => {
    const form = createDefaultApurementPlanForm()
    form.address = '12 rue Test'
    form.postalCode = '21000'
    form.city = 'Dijon'
    form.rentalDebt = 1200
    form.household.adults = [
      createAdultMember({
        firstName: 'Marcel',
        lastName: 'Droitier',
        cafNumber: '39929F999C',
        birthDate: '1980-01-15',
        isLeaseHolder: true
      }),
      createAdultMember({
        firstName: 'Emile',
        lastName: 'Zola',
        cafNumber: '111',
        isLeaseHolder: true
      })
    ]
    form.household.children = [
      createChildMember({ firstName: 'Henri', lastName: 'Becquerel', birthDate: '2025-05-03' })
    ]
    form.income = [
      createAmountLine({
        label: 'Salaire(s) net(s)',
        amount: 1234.56,
        personId: form.household.adults[0].id
      })
    ]
    form.expenses = [createAmountLine({ label: 'Loyer total', amount: 699.45 })]
    form.requestedAids = [
      createAidItem({ label: 'FSL' }),
      createAidItem({ label: 'Action Logement' })
    ]
    form.installments = [
      { id: 'i1', yearMonth: '2026-08', amount: 100 },
      { id: 'i2', yearMonth: '2026-09', amount: 100 }
    ]
    form.banqueDeFranceStatus = 'moratorium'
    form.moratoriumEndDate = '2026-12-31'

    const buffer = readFileSync(TEMPLATE_PATH).buffer as ArrayBuffer
    const data = buildPlanDocxData(
      form,
      {
        id_locataire: 'LOC-42',
        id_client: 'CLI-42',
        email: 'agent@example.fr'
      },
      new Date('2026-07-31T12:00:00')
    )
    const result = await renderDocxTemplate(buffer, data)

    expect(result).toBeInstanceOf(Uint8Array)
    expect(result[0]).toBe(0x50)
    expect(result[1]).toBe(0x4b)

    const { default: PizZip } = await import('pizzip')
    const zip = new PizZip(result)
    const xml = zip.file('word/document.xml')?.asText() ?? ''
    expect(xml).toContain('Marcel')
    expect(xml).toContain('Droitier')
    expect(xml).toContain('Emile')
    expect(xml).toContain('Zola')
    expect(xml).toContain('agent@example.fr')
    expect(xml).toContain('Moratoire')
    expect(xml).toContain('12 rue Test')
    expect(xml).toContain('FSL')
    expect(xml).toContain('08/2026')
    expect(xml).not.toContain('TODO')
    const text = xml.replace(/<[^>]*>/g, '')
    expect(text).not.toMatch(/\{\{[^{}]+}}/)
  })
})
