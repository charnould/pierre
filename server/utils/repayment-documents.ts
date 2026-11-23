import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { type FontBytesByVariant } from 'reamkit'
import { z } from 'zod'

import {
  BANQUE_DE_FRANCE_SITUATIONS,
  budgetTypeLabel,
  CONSENTS,
  CONTEST_STATUSES,
  CONTESTED_TREATMENTS,
  HOUSING_ORIENTATIONS,
  isLeaseHolder,
  isResident,
  LEASE_STATUSES,
  PROOF_LEVELS,
  refreshCaseFile,
  type RepaymentCaseFile,
  RESIDENCE_MODES,
  SCHEDULE_ASSESSMENTS,
  scheduleGap,
  showsCorrespondenceAddress,
  YES_NO
} from '../../shared/repayment-case-file'
import {
  type DocumentChronologyRow,
  isRepaymentDocumentTag,
  missingRepaymentDocumentFields,
  missingRepaymentDocumentMessage,
  repaymentDocumentStage
} from '../../shared/repayment-document-fields'
import { docxToPdf, renderDocx } from './docx'

export const MAX_REPAYMENT_TEMPLATE_BYTES = 5 * 1024 * 1024

const ChronologyRowSchema = z
  .object({
    key: z.string().trim().min(1),
    kind: z.enum(['action', 'phase']),
    label: z.string(),
    date: z.string(),
    commentaire: z.string().nullable()
  })
  .strict()

export const RepaymentDocumentRequestSchema = z
  .object({
    document: z.enum(['diagnostic', 'plan', 'protocole']),
    format: z.enum(['docx', 'pdf']),
    dossier: z.unknown(),
    chronologie: z.array(ChronologyRowSchema).optional()
  })
  .strict()

type DocumentKind = z.infer<typeof RepaymentDocumentRequestSchema>['document']
type DocumentFormat = z.infer<typeof RepaymentDocumentRequestSchema>['format']

const DOCUMENTS = {
  diagnostic: {
    id: 'repayment/diagnostic.docx',
    filename: 'Diagnostic social et financier'
  },
  plan: { id: 'repayment/plan.docx', filename: 'Plan d’apurement' },
  protocole: { id: 'repayment/protocole.docx', filename: 'Protocole de cohésion sociale' }
} as const satisfies Record<DocumentKind, { id: string; filename: string }>

const FACES = ['regular', 'bold', 'italic', 'boldItalic'] as const
const EMBED_SLOTS = {
  regular: 'Regular',
  bold: 'Bold',
  italic: 'Italic',
  boldItalic: 'BoldItalic'
} as const
const FONT_SIGNATURES = new Set([0x00010000, 0x4f54544f, 0x74727565, 0x74746366])
const money = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

export class RepaymentDocumentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RepaymentDocumentError'
  }
}

const documentKind = (id: string): DocumentKind | null =>
  (Object.entries(DOCUMENTS).find(([, document]) => document.id === id)?.[0] as
    DocumentKind | undefined) ?? null

const declaresWordDocument = (content: Uint8Array): boolean =>
  new TextDecoder('latin1').decode(content).includes('word/document.xml')

export function repaymentTemplateIssue(id: string, content: Uint8Array): string | null {
  const kind = documentKind(id)
  if (!kind) return null
  if (content.byteLength > MAX_REPAYMENT_TEMPLATE_BYTES) return 'Le modèle Word dépasse 5 Mo.'
  if (!declaresWordDocument(content)) return null
  const inspected = inspectTemplate(content)
  return typeof inspected === 'string' ? inspected : null
}

export function repaymentDocumentTags(content: Uint8Array): string[] | null {
  if (!declaresWordDocument(content)) return null
  const inspected = inspectTemplate(content)
  return typeof inspected === 'string' ? null : inspected
}

export async function renderRepaymentDocument(input: {
  document: DocumentKind
  format: DocumentFormat
  caseFile: RepaymentCaseFile
  template: Uint8Array
  email: string
  now?: Date
  chronology?: readonly DocumentChronologyRow[]
  stage?: string
}): Promise<{ bytes: Uint8Array; filename: string; mimeType: string }> {
  const inspected =
    input.template.byteLength > MAX_REPAYMENT_TEMPLATE_BYTES ||
    !declaresWordDocument(input.template)
      ? 'Le modèle Word est incomplet.'
      : inspectTemplate(input.template)
  if (typeof inspected === 'string') throw new RepaymentDocumentError(inspected)
  const chronology = input.chronology ?? []
  const missing = missingRepaymentDocumentFields(
    inspected,
    input.caseFile,
    chronology,
    input.stage ?? ''
  )
  if (missing.length > 0) {
    throw new RepaymentDocumentError(missingRepaymentDocumentMessage(missing))
  }
  const docx = renderDocx(
    input.template,
    templateData(
      input.caseFile,
      input.email,
      input.now ?? new Date(),
      chronology,
      input.stage ?? ''
    )
  )
  const bytes =
    input.format === 'pdf'
      ? await docxToPdf(docx, { fonts: embeddedFaces(input.template), remoteFonts: false })
      : docx
  const spec = DOCUMENTS[input.document]
  return {
    bytes,
    filename: `${spec.filename}.${input.format}`,
    mimeType:
      input.format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
}

function inspectTemplate(content: Uint8Array): string[] | string {
  let zip: PizZip
  let tags: string[]
  try {
    zip = new PizZip(content)
    const found = new Set<string>()
    new Docxtemplater(zip, {
      delimiters: { start: '{{', end: '}}' },
      linebreaks: true,
      modules: [
        {
          set(options: { inspect?: { postparsed?: Docxtemplater.DXT.Part[] } }) {
            if (options.inspect?.postparsed) collectTags(options.inspect.postparsed, found)
          }
        }
      ],
      paragraphLoop: true
    })
    tags = [...found]
    const unknown = tags.find((tag) => !isRepaymentDocumentTag(tag))
    if (unknown) return `Le modèle contient la balise inconnue {{${unknown}}}.`
  } catch {
    return 'Le modèle Word est illisible.'
  }
  return fontIssue(zip) ?? tags
}

function collectTags(parts: Docxtemplater.DXT.Part[], found: Set<string>, prefix = '') {
  for (const part of parts) {
    if (part.type !== 'placeholder') continue
    const path = prefix ? `${prefix}.${part.value}` : part.value
    found.add(path)
    if (part.subparsed) collectTags(part.subparsed, found, path)
  }
}

function fontIssue(zip: PizZip): string | null {
  const families = usedFamilies(zip)
  if (families.length !== 1) return 'Le modèle doit utiliser une seule police incorporée.'
  const family = families[0] ?? ''
  const faces = readFaces(zip).get(family)
  if (!faces || FACES.some((slot) => !faces[slot])) {
    return `Incorporez les quatre graisses de ${family}.`
  }
  return null
}

function embeddedFaces(content: Uint8Array): FontBytesByVariant {
  const zip = new PizZip(content)
  const family = usedFamilies(zip)[0] ?? ''
  const faces = readFaces(zip).get(family)
  if (!faces?.regular || !faces.bold || !faces.italic || !faces.boldItalic) {
    throw new RepaymentDocumentError('Le modèle Word est incomplet.')
  }
  return {
    regular: faces.regular,
    bold: faces.bold,
    italic: faces.italic,
    boldItalic: faces.boldItalic
  }
}

function usedFamilies(zip: PizZip): string[] {
  const names = new Set<string>()
  for (const name of Object.keys(zip.files)) {
    if (!/^word\/(?:document|header\d+|footer\d+)\.xml$/.test(name)) continue
    const xml = zip.file(name)?.asText() ?? ''
    for (const match of xml.matchAll(/\bw:(?:ascii|hAnsi|cs)="([^"]+)"/g)) {
      if (match[1]) names.add(match[1])
    }
  }
  return [...names]
}

function readFaces(zip: PizZip): Map<string, Partial<FontBytesByVariant>> {
  const fonts = new Map<string, Partial<FontBytesByVariant>>()
  const table = zip.file('word/fontTable.xml')?.asText()
  const rels = zip.file('word/_rels/fontTable.xml.rels')?.asText() ?? ''
  if (!table) return fonts
  for (const font of table.matchAll(
    /<w:font\b[^>]*\bw:name="([^"]+)"[^>]*>([\s\S]*?)<\/w:font>/g
  )) {
    const name = font[1]
    const body = font[2]
    if (!name || !body) continue
    const faces: Partial<Record<(typeof FACES)[number], Uint8Array>> = {}
    for (const slot of FACES) {
      const tag = new RegExp(`<w:embed${EMBED_SLOTS[slot]}\\b([^>]*)\\/?>`).exec(body)?.[1]
      const id = tag ? /r:id="([^"]+)"/.exec(tag)?.[1] : undefined
      const key = tag ? /w:fontKey="([^"]+)"/.exec(tag)?.[1] : undefined
      const target = id ? relationshipTarget(rels, id) : undefined
      const bytes = target && key ? zip.file(zipPath(target))?.asUint8Array() : undefined
      const face = bytes && key ? deobfuscate(bytes, key) : null
      if (face) faces[slot] = face
    }
    fonts.set(name, faces)
  }
  return fonts
}

function relationshipTarget(rels: string, id: string): string | undefined {
  for (const tag of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const attrs = tag[1] ?? ''
    if (!attrs.includes(`Id="${id}"`)) continue
    return /Target="([^"]+)"/.exec(attrs)?.[1]
  }
  return undefined
}

function zipPath(target: string): string {
  const clean = target.replaceAll('\\', '/')
  if (clean.startsWith('/')) return clean.slice(1)
  return clean.startsWith('word/') ? clean : `word/${clean}`
}

function deobfuscate(data: Uint8Array, fontKey: string): Uint8Array | null {
  const parts = fontKey.replaceAll(/[{}]/g, '').split('-')
  if (
    parts.length !== 5 ||
    parts.some((part) => !/^[0-9a-fA-F]{2,}$/.test(part) || part.length % 2 !== 0)
  ) {
    return null
  }
  const [first, second, third, fourth, fifth] = parts
  if (!first || !second || !third || !fourth || !fifth) return null
  const mask = Uint8Array.from([
    ...hexBytes(first, true),
    ...hexBytes(second, true),
    ...hexBytes(third, true),
    ...hexBytes(fourth, false),
    ...hexBytes(fifth, false)
  ])
  if (mask.length !== 16) return null
  const out = new Uint8Array(data)
  for (let index = 0; index < Math.min(32, out.length); index++) {
    const maskByte = mask[index % 16]
    if (maskByte != null) out[index] = (out[index] ?? 0) ^ maskByte
  }
  const signature =
    (((out[0] ?? 0) << 24) | ((out[1] ?? 0) << 16) | ((out[2] ?? 0) << 8) | (out[3] ?? 0)) >>> 0
  return FONT_SIGNATURES.has(signature) ? out : null
}

function hexBytes(hex: string, reverse: boolean): number[] {
  const bytes = [...hex.matchAll(/../g)].map((match) => Number.parseInt(match[0], 16))
  return reverse ? bytes.reverse() : bytes
}

function templateData(
  caseFile: RepaymentCaseFile,
  email: string,
  now: Date,
  chronology: readonly DocumentChronologyRow[],
  stage: string
): Record<string, unknown> {
  const current = refreshCaseFile(caseFile)
  const common = current.donnees_communes
  const diagnosis = current.diagnostic_social_financier
  const adults = common.foyer.adultes.filter(hasAdultIdentity)
  const children = common.foyer.enfants.filter(hasChildIdentity)
  const resources = common.budget.ressources_mensuelles.filter(
    (row) => row.type || row.montant_en_euros != null
  )
  const oneOffResources = common.budget.ressources_ponctuelles.filter(hasOneOff)
  const charges = common.budget.charges_mensuelles.filter(
    (row) => row.type || row.montant_en_euros != null
  )
  const oneOffCharges = common.budget.charges_ponctuelles.filter(hasOneOff)
  const installments = (current.echeancier?.echeances ?? []).filter(
    (row) => row.date_echeance || row.montant_en_euros != null
  )
  const balance = common.compte_locataire.solde_compte_en_euros
  const leave = adults.find((adult) => adult.date_effet_conge)?.date_effet_conge ?? null
  const social = common.travailleur_social
  const guarantor = common.bail.garant
  const withdrawal = common.bail.retrait_dettes
  const schedule = current.echeancier
  const labels = (items: readonly string[]) =>
    items.filter((item) => item.trim()).map((item) => ({ LABEL: item.trim() }))
  return {
    DATE: frenchDay(parisIso(now)),
    EMAIL: email,
    ADRESSE: common.logement.adresse ?? '',
    CODE_POSTAL: common.logement.code_postal ?? '',
    VILLE: common.logement.commune ?? '',
    ID_CLIENT: common.identification.id_client ?? '',
    ID_LOCATAIRE: common.identification.id_locataire ?? '',
    ID_LOT: common.identification.id_lot ?? '',
    DETTE: euros(balance != null && balance > 0 ? balance : null),
    SOLDE_COMPTE: euros(balance),
    ANCIENNE_DETTE: euros(common.compte_locataire.ancienne_dette_hors_solde_en_euros),
    DATE_ARRETE_COMPTE: frenchDay(common.compte_locataire.date_arrete_compte),
    PREMIER_IMPAYE: frenchDay(common.compte_locataire.date_premier_loyer_impaye),
    STADE: repaymentDocumentStage(chronology, stage),
    DEBUT_BAIL: frenchDay(common.bail.debut_bail),
    CONTENTIEUX_ANTERIEUR: yesNo(common.bail.contentieux_anterieur),
    BANQUE_DE_FRANCE: choice(BANQUE_DE_FRANCE_SITUATIONS, common.bail.situation_banque_de_france),
    DATE_FIN_MORATOIRE: frenchDay(common.bail.date_fin_moratoire),
    GARANT: guarantor ? 'Oui' : 'Non',
    GARANT_NOM: guarantor?.prenom_et_nom ?? '',
    GARANT_COORDONNEES: guarantor?.coordonnees ?? '',
    RETRAIT_DETTES: withdrawal ? 'Oui' : 'Non',
    RETRAIT_DETTES_MONTANT: euros(withdrawal?.montant_en_euros ?? null),
    RETRAIT_DETTES_REGULARISATION: withdrawal ? yesNo(withdrawal.en_cours_de_regularisation) : '',
    STATUT_CONTESTATION: choice(CONTEST_STATUSES, common.compte_locataire.statut_contestation),
    MONTANT_CONTESTE: euros(common.compte_locataire.montant_conteste_en_euros),
    MOTIFS_CONTESTATION: labels(common.compte_locataire.motifs_contestation),
    MOTIFS_IMPAYE: labels(common.compte_locataire.motifs_impaye),
    TRAVAILLEUR_SOCIAL_IDENTIFIE: social ? 'Oui' : 'Non',
    TRAVAILLEUR_SOCIAL: social?.prenom_et_nom || 'Aucun',
    TRAVAILLEUR_SOCIAL_ORGANISME: social?.organisme ?? '',
    TRAVAILLEUR_SOCIAL_COORDONNEES: social?.coordonnees ?? '',
    TRAVAILLEUR_SOCIAL_PREMIERE_RENCONTRE: frenchDay(social?.date_premiere_rencontre ?? null),
    CONGE: frenchDay(leave, 'Non déposé'),
    CONSENTEMENT_DSF: choice(CONSENTS, diagnosis.consentement_recherche_pour_dsf),
    POSITION_MENAGE: diagnosis.position_et_solutions_proposees_par_menage ?? '',
    OBSERVATIONS_BAILLEUR: diagnosis.observations_bailleur ?? '',
    ORIENTATION_LOGEMENT: choice(HOUSING_ORIENTATIONS, diagnosis.orientation_logement.orientation),
    VULNERABILITES: labels(diagnosis.vulnerabilites),
    RISQUES_EXPULSION: labels(diagnosis.risques_expulsion),
    TITULAIRES: adults
      .filter((adult) => isLeaseHolder(adult.statut_bail))
      .map((adult) => ({
        PRENOM: adult.prenom ?? '',
        NOM: adult.nom ?? '',
        CAF: adult.allocataire_caf ?? ''
      })),
    ADULTES: adults.map((adult) => {
      const mail = showsCorrespondenceAddress(adult.mode_residence)
        ? adult.adresse_correspondance
        : null
      return {
        PRENOM: adult.prenom ?? '',
        NOM: adult.nom ?? '',
        DATE_NAISSANCE: frenchDay(adult.date_naissance),
        STATUT_PRO: adult.type_emploi ?? '',
        EMPLOYEUR: adult.employeur ?? '',
        CAF: adult.allocataire_caf ?? '',
        TITULAIRE: isLeaseHolder(adult.statut_bail) ? 'Oui' : 'Non',
        OCCUPANT: isResident(adult.mode_residence) ? 'Oui' : 'Non',
        SITUATION_BAIL: choice(LEASE_STATUSES, adult.statut_bail),
        MODE_RESIDENCE: choice(RESIDENCE_MODES, adult.mode_residence),
        ADRESSE_CORRESPONDANCE: mail?.adresse ?? '',
        CODE_POSTAL_CORRESPONDANCE: mail?.code_postal ?? '',
        VILLE_CORRESPONDANCE: mail?.commune ?? '',
        DATE_RECEPTION_PREAVIS: frenchDay(adult.date_reception_preavis),
        DATE_EFFET_CONGE: frenchDay(adult.date_effet_conge),
        DATE_FIN_SOLIDARITE: frenchDay(adult.date_fin_solidarite)
      }
    }),
    ENFANTS: children.map((child) => ({
      PRENOM: child.prenom ?? '',
      NOM: child.nom ?? '',
      DATE_NAISSANCE: frenchDay(child.date_naissance),
      A_CHARGE: choice(YES_NO, child.a_charge),
      MODE_RESIDENCE: choice(RESIDENCE_MODES, child.mode_residence)
    })),
    AIDES: labels(common.aides_mobilisables),
    RESSOURCES: resources.map((row) => ({
      TYPE: budgetTypeLabel(row.type),
      PERSONNE: personName(common, row.id_personne),
      MONTANT: euros(row.montant_en_euros),
      PREUVE: choice(PROOF_LEVELS, row.niveau_preuve),
      DATE_PREUVE: frenchDay(row.date_niveau_preuve),
      DATE_DEBUT: frenchDay(row.date_debut),
      DATE_FIN: frenchDay(row.date_fin)
    })),
    TOTAL_RESSOURCES: euros(sum(resources.map((row) => row.montant_en_euros))),
    RESSOURCES_PONCTUELLES: oneOffResources.map((row) => ({
      TYPE: budgetTypeLabel(row.type),
      PERSONNE: personName(common, row.id_personne),
      MOIS: frenchMonth(row.mois_imputation),
      MONTANT: euros(row.montant_en_euros),
      PREUVE: choice(PROOF_LEVELS, row.niveau_preuve),
      DATE_PREUVE: frenchDay(row.date_niveau_preuve)
    })),
    TOTAL_RESSOURCES_PONCTUELLES: euros(sum(oneOffResources.map((row) => row.montant_en_euros))),
    CHARGES: charges.map((row) => ({
      TYPE: budgetTypeLabel(row.type),
      PERSONNE: personName(common, row.id_personne),
      MONTANT: euros(row.montant_en_euros),
      PREUVE: choice(PROOF_LEVELS, row.niveau_preuve),
      DATE_PREUVE: frenchDay(row.date_niveau_preuve),
      DATE_DEBUT: frenchDay(row.date_debut),
      DATE_FIN: frenchDay(row.date_fin)
    })),
    TOTAL_CHARGES: euros(sum(charges.map((row) => row.montant_en_euros))),
    CHARGES_PONCTUELLES: oneOffCharges.map((row) => ({
      TYPE: budgetTypeLabel(row.type),
      PERSONNE: personName(common, row.id_personne),
      MOIS: frenchMonth(row.mois_imputation),
      MONTANT: euros(row.montant_en_euros),
      PREUVE: choice(PROOF_LEVELS, row.niveau_preuve),
      DATE_PREUVE: frenchDay(row.date_niveau_preuve)
    })),
    TOTAL_CHARGES_PONCTUELLES: euros(sum(oneOffCharges.map((row) => row.montant_en_euros))),
    CHRONOLOGIE: chronology
      .filter((row) => row.label.trim() && row.date.trim())
      .map((row) => ({
        TYPE: row.kind === 'action' ? 'Action' : 'Phase',
        EVENEMENT: row.label.trim(),
        DATE: frenchDay(row.date),
        COMMENTAIRE: row.commentaire?.trim() ?? ''
      })),
    ECHEANCIER_PROPOSE: schedule ? 'Oui' : 'Non',
    ECHEANCIER_INCLURE_ANCIENNE_DETTE: schedule
      ? yesNo(schedule.inclure_ancienne_dette_locative)
      : '',
    ECHEANCIER_TRAITEMENT_CONTESTATION: schedule
      ? choice(CONTESTED_TREATMENTS, schedule.traitement_montant_conteste)
      : '',
    MONTANT_A_APURER: euros(schedule?.montant_a_apurer_en_euros ?? null),
    ECART_ECHEANCIER: euros(schedule ? scheduleGap(schedule) : null),
    SOUTENABILITE_ECHEANCIER: choice(SCHEDULE_ASSESSMENTS, diagnosis.appreciation_echeancier),
    MOTIF_NON_SOUTENABILITE: diagnosis.motif_non_soutenabilite ?? '',
    ECHEANCES: installments.map((row, index) => ({
      NUMERO: String(index + 1),
      ECHEANCE: frenchDay(row.date_echeance),
      MONTANT: euros(row.montant_en_euros),
      RESSOURCES: euros(row.ressources_totales_du_mois_en_euros),
      CHARGES: euros(row.charges_totales_du_mois_en_euros),
      UC: units(row.unites_de_consommation),
      TAUX_EFFORT_LOYER_NET: percent(row.taux_effort_loyer_net),
      RAV_LOYER_NET: euros(row.reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros),
      TAUX_EFFORT_GLOBAL: percent(row.taux_effort_global),
      RAV_GLOBAL: euros(row.reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros)
    })),
    TOTAL_PLAN: euros(sum(installments.map((row) => row.montant_en_euros)))
  }
}

function choice(
  options: readonly (readonly [string, string, ...string[]])[],
  code: string | null
): string {
  if (!code) return ''
  return options.find(([value]) => value === code)?.[1] ?? ''
}

function yesNo(value: boolean): string {
  return value ? 'Oui' : 'Non'
}

function percent(value: number | null): string {
  if (value == null) return ''
  const label = (value * 100).toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })
  return `${label} %`
}

function units(value: number | null): string {
  if (value == null) return ''
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

function personName(common: RepaymentCaseFile['donnees_communes'], id: string | null): string {
  if (id == null) return 'Foyer'
  const person = [...common.foyer.adultes, ...common.foyer.enfants].find(
    (member) => member.id_personne === id
  )
  if (!person) return ''
  return [person.prenom, person.nom].filter(Boolean).join(' ')
}

function hasAdultIdentity(
  adult: RepaymentCaseFile['donnees_communes']['foyer']['adultes'][number]
): boolean {
  return [
    adult.prenom,
    adult.nom,
    adult.date_naissance,
    adult.type_emploi,
    adult.employeur,
    adult.allocataire_caf
  ].some((value) => value != null && value !== '')
}

function hasChildIdentity(
  child: RepaymentCaseFile['donnees_communes']['foyer']['enfants'][number]
): boolean {
  return [child.prenom, child.nom, child.date_naissance].some(
    (value) => value != null && value !== ''
  )
}

function hasOneOff(row: {
  type: string | null
  mois_imputation: string | null
  montant_en_euros: number | null
}): boolean {
  return row.type != null || row.mois_imputation != null || row.montant_en_euros != null
}

function sum(values: Array<number | null>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0)
}

function euros(value: number | null): string {
  return value == null ? '' : money.format(value)
}

function frenchDay(value: string | null, empty = ''): string {
  if (!value) return empty
  const [year, month, date] = value.split('-')
  return year && month && date ? `${date}/${month}/${year}` : empty
}

function frenchMonth(value: string | null): string {
  if (!value) return ''
  const [year, month] = value.split('-')
  return year && month ? `${month}/${year}` : ''
}

function parisIso(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
}
