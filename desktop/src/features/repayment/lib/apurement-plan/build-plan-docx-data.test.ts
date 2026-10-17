import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { renderDocxTemplate } from '@/features/workflow/lib/generate-docx'
import { loadCustomizationFixture } from '@/shared/lib/instance-customization.fixture'

import { buildPlanDocxData, formatMoneyPlain, resolveLeaseHolders } from './build-plan-docx-data'
import { computeInstallmentBudget } from './calculations'
import {
  createAdultMember,
  createAidItem,
  createAmountLine,
  createChildMember,
  createDefaultRepaymentPlanForm
} from './defaults'
import { formatAmountSplit, formatEffortRate, formatMoneyDisplay, formatUnits } from './money'

const CTX = {
  id_locataire: 'LOC-1',
  id_client: 'CLI-1',
  email: 'hlebras@granddijonhabitat.fr'
}

describe('buildPlanDocxData', () => {
  beforeAll(() => {
    loadCustomizationFixture()
  })

  const now = new Date('2026-07-31T12:00:00')

  test('n’expose que des clés ALL CAPS du contrat', () => {
    const form = createDefaultRepaymentPlanForm()
    const data = buildPlanDocxData(form, CTX, now)
    const keys = Object.keys(data).sort()
    expect(keys).toEqual([
      'ADRESSE',
      'ADULTES',
      'AIDES',
      'AVENANT',
      'BANQUE_DE_FRANCE',
      'CCAPEX',
      'CHARGES',
      'CLAUSE_SOLIDARITE',
      'CODE_POSTAL',
      'CONGE',
      'CTESI',
      'DATE',
      'DETTE',
      'ECHEANCES',
      'EMAIL',
      'ENFANTS',
      'ID_CLIENT',
      'ID_LOCATAIRE',
      'ID_LOT',
      'PREMIER_IMPAYE',
      'RESSOURCES',
      'STADE',
      'TITULAIRES',
      'TOTAL_CHARGES',
      'TOTAL_PLAN',
      'TOTAL_RESSOURCES',
      'TRAVAILLEUR_SOCIAL',
      'TYPE_PLAN',
      'VILLE'
    ])
    expect(data.EMAIL).toBe('hlebras@granddijonhabitat.fr')
    expect(data.ID_CLIENT).toBe('CLI-1')
    expect(data.ID_LOCATAIRE).toBe('LOC-1')
    expect(data.AVENANT).toBe('non')
    expect(data.CCAPEX).toBe('non')
    expect(data.CTESI).toBe('non')
    expect(data.CONGE).toBe('')
    expect(data.CLAUSE_SOLIDARITE).toBe('')
    form.amendmentSigned = true
    form.noticeDate = '2026-08-31'
    form.ccapexDate = '2026-03-12'
    form.ctesiDate = '2026-04-02'
    const dated = buildPlanDocxData(form, CTX, now)
    expect(dated.AVENANT).toBe('oui')
    expect(dated.CONGE).toBe('31/08/2026')
    expect(dated.CLAUSE_SOLIDARITE).toBe('28/02/2027')
    expect(dated.CCAPEX).toBe('12/03/2026')
    expect(dated.CTESI).toBe('02/04/2026')
    form.procedureStage = 'cdp'
    form.procedureStageDate = '2026-03-12'
    expect(buildPlanDocxData(form, CTX, now).STADE).toBe('Commandement de payer le 12/03/2026')
  })

  test('formate la dette sans symbole monétaire', () => {
    const form = createDefaultRepaymentPlanForm()
    form.rentalDebt = 1234.5
    const data = buildPlanDocxData(form, CTX, now)
    expect(data.DETTE).toBe(formatMoneyPlain(1234.5))
    expect(data.DETTE).not.toContain('€')
  })

  test('boucle TITULAIRES sur tous les titulaires du bail', () => {
    const form = createDefaultRepaymentPlanForm()
    form.household.adults = [
      createAdultMember({
        firstName: 'Emile',
        lastName: 'Zola',
        cafNumber: '111',
        isLeaseHolder: true
      }),
      createAdultMember({
        firstName: 'Marcel',
        lastName: 'Droitier',
        cafNumber: '39929F999C',
        isLeaseHolder: true
      }),
      createAdultMember({
        firstName: 'Autre',
        lastName: 'NonTitulaire',
        cafNumber: '999',
        isLeaseHolder: false
      })
    ]
    expect(resolveLeaseHolders(form.household.adults)).toHaveLength(2)
    const data = buildPlanDocxData(form, CTX, now)
    expect(data.TITULAIRES).toEqual([
      { PRENOM: 'Emile', NOM: 'Zola', CAF: '111' },
      { PRENOM: 'Marcel', NOM: 'Droitier', CAF: '39929F999C' }
    ])
  })

  test('produit des tableaux de même longueur que les listes formulaire', () => {
    const form = createDefaultRepaymentPlanForm()
    form.household.adults = [
      createAdultMember({ firstName: 'A', lastName: 'Un' }),
      createAdultMember({ firstName: 'B', lastName: 'Deux', isLeaseHolder: false })
    ]
    form.household.children = [createChildMember({ firstName: 'C', lastName: 'Trois' })]
    form.income = [
      createAmountLine({
        label: 'Salaire(s) net(s)',
        amount: 1000,
        personId: form.household.adults[0].id
      })
    ]
    form.expenses = [
      createAmountLine({ label: 'Loyer + Charges - Aide au logement', amount: 400 }),
      createAmountLine({ label: 'Crédit en cours', amount: 120, endMonth: '2028-06' })
    ]
    form.requestedAids = [
      createAidItem({ label: 'FSL' }),
      createAidItem({ label: 'Action Logement' })
    ]
    form.installments = [
      { id: 'i1', date: '2026-08-01', amount: 50 },
      { id: 'i2', date: '2026-09-01', amount: 50 },
      { id: 'i3', date: '2028-07-01', amount: 50 }
    ]

    const data = buildPlanDocxData(form, CTX, now)
    expect(data.ADULTES).toHaveLength(2)
    expect(data.ADULTES[0]).not.toHaveProperty('CAISSE_RETRAITE')
    expect(data.ADULTES[0]?.STATUT_PRO).toBe('Salarié en CDI')
    expect(data.ADULTES[0]?.EMPLOYEUR).toBe('')
    expect(data.ADULTES[0]?.OCCUPANT).toBe('Oui')
    form.household.adults[0]!.employmentStatus = 'student'
    expect(buildPlanDocxData(form, CTX, now).ADULTES[0]?.STATUT_PRO).toBe('Étudiant')
    expect(data.ENFANTS).toHaveLength(1)
    expect(data.RESSOURCES).toHaveLength(1)
    expect(data.CHARGES).toHaveLength(2)
    expect(data.CHARGES[1]?.TYPE).toBe("Crédit en cours (jusqu'au 06/2028)")
    expect(data.AIDES).toHaveLength(2)
    expect(data.ECHEANCES).toHaveLength(3)
    const schedule = (date: string, amount: number) => {
      const month = computeInstallmentBudget(form, date, amount)
      const resources = formatAmountSplit(month.recurringIncome, month.punctualIncome)
      const charges = formatAmountSplit(month.recurringExpenses, month.punctualExpenses)
      return {
        RESSOURCES_MOIS: `${resources.total} ${resources.detail}`,
        CHARGES_MOIS: `${charges.total} ${charges.detail}`,
        UC: formatUnits(month.consumptionUnits),
        RESTE_COMPLET: formatMoneyDisplay(month.dailyRemainder),
        TAUX_COMPLET: formatEffortRate(month.effortRate),
        RESTE_SIMPLIFIE: formatMoneyDisplay(month.simplifiedDailyRemainder),
        TAUX_SIMPLIFIE: formatEffortRate(month.simplifiedEffortRate)
      }
    }
    expect(data.ECHEANCES[0]).toEqual({
      NUMERO: '1',
      ECHEANCE: '01/08/2026',
      MONTANT: formatMoneyPlain(50),
      ...schedule('2026-08-01', 50)
    })
    expect(data.ECHEANCES[2]).toEqual({
      NUMERO: '3',
      ECHEANCE: '01/07/2028',
      MONTANT: formatMoneyPlain(50),
      ...schedule('2028-07-01', 50)
    })
    expect(data.ECHEANCES[2]?.TAUX_COMPLET).not.toBe(data.ECHEANCES[0]?.TAUX_COMPLET)
    expect(data.ECHEANCES[2]?.CHARGES_MOIS).not.toBe(data.ECHEANCES[0]?.CHARGES_MOIS)
    expect(data.RESSOURCES[0].PERSONNE).toBe('A Un')
  })

  test('mappe la Banque de France en un seul champ', () => {
    const form = createDefaultRepaymentPlanForm()
    form.banqueDeFranceStatus = 'moratorium'
    form.moratoriumEndDate = '2026-12-31'
    const data = buildPlanDocxData(form, CTX, now)
    expect(data.BANQUE_DE_FRANCE).toContain('Moratoire')
    expect(data.BANQUE_DE_FRANCE).toContain('31/12/2026')
    expect(data).not.toHaveProperty('prp')
    expect(data).not.toHaveProperty('moratoire_ligne')
    form.banqueDeFranceStatus = 'prp'
    expect(buildPlanDocxData(form, CTX, now).BANQUE_DE_FRANCE).toBe(
      'Plan de redressement personnel (PRP)'
    )
  })

  test('expose la date du document', () => {
    const form = createDefaultRepaymentPlanForm()
    const data = buildPlanDocxData(form, { ...CTX, id_locataire: 'LOC-9' }, now)
    expect(data.DATE).toContain('2026')
    expect(data.ID_LOCATAIRE).toBe('LOC-9')
    expect(data.TYPE_PLAN).toBe("Plan d'apurement")
  })

  test('expose l’identifiant du patrimoine et les coordonnées du travailleur social', () => {
    const form = createDefaultRepaymentPlanForm()
    form.idLot = 'LOT-9'
    form.hasSocialWorker = true
    form.socialWorkerName = 'Ada'
    form.socialWorkerOrganization = 'CCAS'
    form.socialWorkerContact = 'ada@exemple.fr'
    const data = buildPlanDocxData(form, CTX, now)
    expect(data.ID_LOT).toBe('LOT-9')
    expect(data.TRAVAILLEUR_SOCIAL).toBe('Ada — CCAS — ada@exemple.fr')
    form.socialWorkerLastContactDate = '2026-03-12'
    expect(buildPlanDocxData(form, CTX, now).TRAVAILLEUR_SOCIAL).toBe(
      'Ada — CCAS — ada@exemple.fr — dernier contact le 12/03/2026'
    )
  })

  test('écrit l’échéancier du module à la fin du courrier', async () => {
    const form = createDefaultRepaymentPlanForm()
    form.income = [
      createAmountLine({ label: 'Salaire(s) net(s)', amount: 1500, custom: false }),
      createAmountLine({ label: 'APL / ALF / ALS (tiers payant)', amount: 200, custom: false })
    ]
    form.expenses = [
      createAmountLine({ label: 'Loyer + Charges - Aide au logement', amount: 500, custom: false }),
      createAmountLine({ label: 'Mutuelle santé', amount: 50, custom: false })
    ]
    const data = buildPlanDocxData(form, CTX, now)
    const template = readFileSync(
      join(
        import.meta.dir,
        '../../../../../..',
        'docs/04-core-intelligence-hlm/templates',
        "Plan d'apurement.docx"
      )
    )
    const rendered = await renderDocxTemplate(template.buffer, data)
    const { default: PizZip } = await import('pizzip')
    const xml = new PizZip(rendered).file('word/document.xml')?.asText() ?? ''
    const text = [...xml.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/g)]
      .map((match) => match[1])
      .join('')
    expect(text).not.toContain('{{')
    expect(text).toContain('2.5. ÉCHÉANCIER')
    expect(text).toContain('Reste à vivre')
    expect(text).toContain('Taux d’effort')
    const schedule = text.indexOf('2.5. ÉCHÉANCIER')
    const firstRate = text.indexOf(data.ECHEANCES[0]?.TAUX_COMPLET ?? '')
    expect(schedule).toBeGreaterThan(text.indexOf('2.4. CHARGES'))
    expect(firstRate).toBeGreaterThan(schedule)
    expect(text.indexOf('— FIN DU DOCUMENT —')).toBeGreaterThan(firstRate)
  })
})
