import { describe, expect, test } from 'bun:test'

import { emptyRepaymentCaseFile } from './repayment-case-file'
import {
  isRepaymentDocumentTag,
  missingRepaymentDocumentFields,
  missingRepaymentDocumentMessage,
  REPAYMENT_DOCUMENT_TAGS,
  repaymentDocumentStage
} from './repayment-document-fields'

const stage = 'Recouvrement amiable'

describe('balises du dossier', () => {
  test('ignore une balise absente du modèle', () => {
    expect(missingRepaymentDocumentFields(['DATE'], emptyRepaymentCaseFile(), [], stage)).toEqual(
      []
    )
    expect(isRepaymentDocumentTag('AVENANT')).toBe(false)
    expect(isRepaymentDocumentTag('ID_CLIENT')).toBe(true)
  })

  test('signale les identifiants et saute le garant tant qu’il est désactivé', () => {
    const fields = missingRepaymentDocumentFields(
      ['ID_CLIENT', 'GARANT_NOM', 'DATE_FIN_MORATOIRE'],
      emptyRepaymentCaseFile(),
      [],
      stage
    )
    expect(fields.map((field) => field.targetId)).toEqual(['id_client'])
  })

  test('demande le nom du garant seulement lorsqu’il est identifié', () => {
    const caseFile = emptyRepaymentCaseFile()
    caseFile.donnees_communes.bail.garant = { prenom_et_nom: null, coordonnees: null }
    const fields = missingRepaymentDocumentFields(['GARANT_NOM'], caseFile, [], stage)
    expect(fields).toEqual([
      {
        targetId: 'garant_prenom_et_nom',
        section: 'Bail et compte locataire',
        label: 'Prénom et nom du garant'
      }
    ])
    expect(missingRepaymentDocumentMessage(fields)).toBe('Il manque : Prénom et nom du garant.')
  })

  test('exige CAF, employeur, ressources, charges et chronologie quand leurs balises sont présentes', () => {
    const fields = missingRepaymentDocumentFields(
      REPAYMENT_DOCUMENT_TAGS,
      emptyRepaymentCaseFile(),
      [],
      stage
    )
    const ids = fields.map((field) => field.targetId)
    expect(ids).toContain('adult_0_employeur')
    expect(ids).toContain('adult_0_allocataire_caf')
    expect(ids).toContain('ressource_mensuelle_0_type')
    expect(ids).toContain('ressource_mensuelle_0_montant')
    expect(ids).toContain('ressource_mensuelle_0_preuve')
    expect(ids).toContain('charge_mensuelle_0_montant')
    expect(ids).toContain('charge_mensuelle_0_preuve')
    expect(ids).toContain('debut_bail')
    expect(ids).toContain('consentement_recherche_pour_dsf')
    expect(ids).toContain('chronologie_ajouter_action')
    expect(ids).toContain('echeancier_proposer')
  })

  test('n’exige pas d’employeur pour un adulte sans emploi ou retraité', () => {
    const caseFile = emptyRepaymentCaseFile()
    caseFile.donnees_communes.foyer.adultes[0]!.type_emploi = 'Retraité'
    const fields = missingRepaymentDocumentFields(['ADULTES.EMPLOYEUR'], caseFile, [], stage)
    expect(fields).toEqual([])
  })

  test('signale un préavis partiellement renseigné dans le Popover adulte', () => {
    const caseFile = emptyRepaymentCaseFile()
    caseFile.donnees_communes.foyer.adultes[0]!.date_reception_preavis = '2026-04-01'
    const fields = missingRepaymentDocumentFields(['ADULTES.DATE_EFFET_CONGE'], caseFile, [], stage)
    expect(fields).toEqual([
      {
        targetId: 'adult_0_date_effet_conge',
        section: 'Membres du foyer',
        label: 'Effet du congé de l’adulte 1',
        adultPopoverIndex: 0
      }
    ])
  })

  test('demande un échéancier lorsque le modèle en contient un', () => {
    const fields = missingRepaymentDocumentFields(
      ['ECHEANCES.MONTANT', 'SOUTENABILITE_ECHEANCIER'],
      emptyRepaymentCaseFile(),
      [],
      stage
    )
    expect(fields.map((field) => field.targetId)).toEqual(['echeancier_proposer'])
  })

  test('retient la dernière phase datée', () => {
    expect(
      repaymentDocumentStage(
        [
          { key: 'a', kind: 'phase', label: 'Amiable', date: '2026-01-01', commentaire: null },
          { key: 'b', kind: 'phase', label: 'Contentieux', date: '2026-03-01', commentaire: null }
        ],
        stage
      )
    ).toBe('Contentieux')
    expect(repaymentDocumentStage([], stage)).toBe(stage)
  })

  test('signale une action de chronologie incomplète', () => {
    const fields = missingRepaymentDocumentFields(
      ['CHRONOLOGIE.EVENEMENT'],
      emptyRepaymentCaseFile(),
      [{ key: 'action-1', kind: 'action', label: '', date: '2026-05-01', commentaire: null }],
      stage
    )
    expect(fields[0]?.targetId).toBe('chronologie_action-1_action')
  })
})
