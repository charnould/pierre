import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import PizZip from 'pizzip'

import {
  blankAdult,
  blankChild,
  blankInstallment,
  blankMonthlyLine,
  blankOneOffLine,
  emptyRepaymentForms,
  type RepaymentForms
} from '../../../../shared/repayment-plan'
import {
  MAX_REPAYMENT_TEMPLATE_BYTES,
  renderRepaymentDocument,
  repaymentTemplateIssue
} from '../../../utils/repayment-documents'

const templates = join(import.meta.dir, '../../../../docs/04-core-intelligence-hlm/templates')

const dossier: RepaymentForms = emptyRepaymentForms()
dossier.donnees_communes.identification = {
  id_client: 'CLI-1',
  id_locataire: 'LOC-1',
  id_lot: 'LOT-1'
}
dossier.donnees_communes.logement = {
  adresse: '1 rue des Lilas',
  code_postal: '21000',
  commune: 'Dijon'
}
dossier.donnees_communes.compte_locataire.solde_compte_en_euros = 1200
dossier.donnees_communes.compte_locataire.date_premier_loyer_impaye = '2026-01-05'
dossier.donnees_communes.compte_locataire.motifs_impaye = ['Perte d’emploi']
dossier.donnees_communes.compte_locataire.ancienne_dette_hors_solde_en_euros = 50
dossier.donnees_communes.travailleur_social = {
  prenom_et_nom: 'Camille Martin',
  organisme: 'CCAS',
  coordonnees: 'camille@example.org'
}
dossier.donnees_communes.aides_mobilisables = ['FSL']
dossier.donnees_communes.bail.garant = { prenom: 'Paul', nom: 'Bernard' }
dossier.donnees_communes.foyer.adultes = [
  blankAdult('personne_1'),
  {
    ...blankAdult('personne_2'),
    prenom: 'Ada',
    nom: 'Lovelace',
    date_naissance: '1980-12-10',
    type_emploi: 'Salarié en CDI',
    employeur: 'Atelier',
    allocataire_caf: '1234567',
    statut_bail: 'titulaire_origine_et_actuel',
    mode_residence: 'permanente'
  }
]
dossier.donnees_communes.foyer.enfants = [
  blankChild('personne_3'),
  {
    ...blankChild('personne_4'),
    prenom: 'Lina',
    nom: 'Lovelace',
    date_naissance: '2016-04-02',
    a_charge: 'oui'
  }
]
dossier.donnees_communes.budget.ressources_mensuelles = [
  blankMonthlyLine(),
  { ...blankMonthlyLine(), type: 'salaire_net', id_personne: 'personne_2', montant_en_euros: 1500 }
]
dossier.donnees_communes.budget.ressources_ponctuelles = [
  {
    ...blankOneOffLine(),
    type: 'prime_exceptionnelle',
    id_personne: 'personne_2',
    mois_imputation: '2026-04',
    montant_en_euros: 300
  }
]
dossier.donnees_communes.budget.charges_mensuelles = [
  { ...blankMonthlyLine(), type: 'cout_logement_net', montant_en_euros: 400 },
  blankMonthlyLine(),
  {
    ...blankMonthlyLine(),
    type: 'energie_eau',
    id_personne: 'personne_2',
    date_fin: '2027-01-01',
    montant_en_euros: 80
  }
]
dossier.donnees_communes.budget.charges_ponctuelles = [
  {
    ...blankOneOffLine(),
    type: 'sante_ponctuelle',
    id_personne: 'personne_2',
    mois_imputation: '2026-05',
    montant_en_euros: 120
  }
]
dossier.echeancier.echeances = [blankInstallment(), blankInstallment('2026-06-01', 100)]

const template = (name: string) =>
  new Uint8Array(readFileSync(join(templates, `Impayés - docx - ${name}.docx`)))

const xmlOf = (bytes: Uint8Array) => new PizZip(bytes).file('word/document.xml')!.asText()

describe('documents d’apurement', () => {
  it('remplit les trois modèles sans imprimer les lignes vides', async () => {
    const diagnostic = await renderRepaymentDocument({
      document: 'diagnostic',
      format: 'docx',
      dossier,
      template: template('Diagnostic social et financier'),
      email: 'ada@example.org',
      now: new Date('2026-11-06T12:00:00Z')
    })
    const diagnosticXml = xmlOf(diagnostic.bytes)
    expect(diagnostic.filename).toBe('Diagnostic social et financier.docx')
    expect(diagnosticXml).toContain('Ada')
    expect(diagnosticXml).toContain('Lovelace')
    expect(diagnosticXml).toContain('Prime exceptionnelle')
    expect(diagnosticXml).toContain('04/2026')
    expect(diagnosticXml).toContain('Loyer + Charges - Aides au logement')
    expect(diagnosticXml).toContain('Santé')
    expect(diagnosticXml).toContain('05/2026')
    expect(diagnosticXml).toContain('Non saisie')
    expect(diagnosticXml).toContain('Non déposé')
    expect(diagnosticXml).toContain('06/11/2026')
    expect(diagnosticXml).toContain('ada@example.org')
    expect(diagnosticXml).not.toContain('{{')
    expect(diagnosticXml).not.toContain('CLAUSE_SOLIDARITE')
    expect(diagnosticXml).not.toContain('Paul')
    expect(diagnosticXml).not.toContain('Perte')

    const plan = await renderRepaymentDocument({
      document: 'plan',
      format: 'docx',
      dossier,
      template: template("Plan d'apurement"),
      email: 'ada@example.org',
      now: new Date('2026-11-06T12:00:00Z')
    })
    const planXml = xmlOf(plan.bytes)
    expect(planXml).toContain('1 200,00')
    expect(planXml).toContain('01/06/2026')
    expect(planXml).toContain('100,00')
    expect(planXml).toContain('Prime exceptionnelle')
    expect(planXml).not.toContain('{{')
    expect(planXml).not.toContain('Camille')

    const protocole = await renderRepaymentDocument({
      document: 'protocole',
      format: 'docx',
      dossier,
      template: template('Protocole de cohésion sociale'),
      email: 'ada@example.org',
      now: new Date('2026-11-06T12:00:00Z')
    })
    const protocoleXml = xmlOf(protocole.bytes)
    expect(protocoleXml).toContain('01/06/2026')
    expect(protocoleXml).toContain('Santé')
    expect(protocoleXml).not.toContain('{{')
  })

  it('convertit le diagnostic en PDF sans police distante', async () => {
    const pdf = await renderRepaymentDocument({
      document: 'diagnostic',
      format: 'pdf',
      dossier,
      template: template('Diagnostic social et financier'),
      email: 'ada@example.org',
      now: new Date('2026-11-06T12:00:00Z')
    })
    expect(pdf.mimeType).toBe('application/pdf')
    expect(new TextDecoder().decode(pdf.bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('accepte un dépôt technique trop court et refuse un modèle incomplet', () => {
    expect(
      repaymentTemplateIssue('repayment/plan.docx', new Uint8Array([0x50, 0x4b, 0x03, 0x04]))
    ).toBeNull()
    const huge = new Uint8Array(MAX_REPAYMENT_TEMPLATE_BYTES + 1)
    huge[0] = 0x50
    expect(repaymentTemplateIssue('repayment/plan.docx', huge)).toBe('Le modèle Word dépasse 5 Mo.')
    const zip = new PizZip()
    zip.file(
      '[Content_Types].xml',
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
    )
    zip
      .folder('_rels')
      ?.file(
        '.rels',
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
      )
    zip
      .folder('word')
      ?.file(
        'document.xml',
        '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:rFonts w:ascii="Times New Roman"/></w:rPr><w:t>{{INCONNUE}}</w:t></w:r></w:p></w:body></w:document>'
      )
    const bytes = zip.generate({ type: 'uint8array' })
    expect(repaymentTemplateIssue('repayment/diagnostic.docx', bytes)).toContain('{{')
  })
})
