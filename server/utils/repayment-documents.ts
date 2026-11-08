import Docxtemplater from 'docxtemplater'
import InspectModule from 'docxtemplater/js/inspect-module.js'
import PizZip from 'pizzip'
import { type FontBytesByVariant } from 'reamkit'
import { z } from 'zod'

import {
  budgetTypeLabel,
  isLeaseHolder,
  isResident,
  type RepaymentForms
} from '../../shared/repayment-plan'
import { docxToPdf, renderDocx } from './docx'

export const MAX_REPAYMENT_TEMPLATE_BYTES = 5 * 1024 * 1024

export type RepaymentDossier = RepaymentForms

export const RepaymentDocumentRequestSchema = z
  .object({
    document: z.enum(['diagnostic', 'plan', 'protocole']),
    format: z.enum(['docx', 'pdf']),
    dossier: z.unknown()
  })
  .strict()

type DocumentKind = z.infer<typeof RepaymentDocumentRequestSchema>['document']
type DocumentFormat = z.infer<typeof RepaymentDocumentRequestSchema>['format']

const SHARED_TAGS = [
  'DATE',
  'EMAIL',
  'ADRESSE',
  'CODE_POSTAL',
  'VILLE',
  'ID_CLIENT',
  'ID_LOCATAIRE',
  'ID_LOT',
  'TITULAIRES',
  'TITULAIRES.PRENOM',
  'TITULAIRES.NOM',
  'TITULAIRES.CAF',
  'ADULTES',
  'ADULTES.PRENOM',
  'ADULTES.NOM',
  'ADULTES.DATE_NAISSANCE',
  'ADULTES.STATUT_PRO',
  'ADULTES.EMPLOYEUR',
  'ADULTES.CAF',
  'ADULTES.TITULAIRE',
  'ADULTES.OCCUPANT',
  'ENFANTS',
  'ENFANTS.PRENOM',
  'ENFANTS.NOM',
  'ENFANTS.DATE_NAISSANCE',
  'ENFANTS.A_CHARGE',
  'RESSOURCES',
  'RESSOURCES.TYPE',
  'RESSOURCES.PERSONNE',
  'RESSOURCES.MONTANT',
  'TOTAL_RESSOURCES',
  'RESSOURCES_PONCTUELLES',
  'RESSOURCES_PONCTUELLES.TYPE',
  'RESSOURCES_PONCTUELLES.PERSONNE',
  'RESSOURCES_PONCTUELLES.MOIS',
  'RESSOURCES_PONCTUELLES.MONTANT',
  'TOTAL_RESSOURCES_PONCTUELLES',
  'CHARGES',
  'CHARGES.TYPE',
  'CHARGES.MONTANT',
  'TOTAL_CHARGES',
  'CHARGES_PONCTUELLES',
  'CHARGES_PONCTUELLES.TYPE',
  'CHARGES_PONCTUELLES.PERSONNE',
  'CHARGES_PONCTUELLES.MOIS',
  'CHARGES_PONCTUELLES.MONTANT',
  'TOTAL_CHARGES_PONCTUELLES'
] as const

const DOCUMENT_TAGS = {
  diagnostic: [
    ...SHARED_TAGS,
    'BANQUE_DE_FRANCE',
    'PREMIER_IMPAYE',
    'STADE',
    'CCAPEX',
    'CTESI',
    'TRAVAILLEUR_SOCIAL',
    'AIDES',
    'AIDES.LABEL',
    'AVENANT',
    'CONGE'
  ],
  plan: [
    ...SHARED_TAGS,
    'DETTE',
    'ECHEANCES',
    'ECHEANCES.NUMERO',
    'ECHEANCES.ECHEANCE',
    'ECHEANCES.MONTANT',
    'TOTAL_PLAN'
  ],
  protocole: [
    ...SHARED_TAGS,
    'DETTE',
    'ECHEANCES',
    'ECHEANCES.NUMERO',
    'ECHEANCES.ECHEANCE',
    'ECHEANCES.MONTANT',
    'TOTAL_PLAN'
  ]
} as const

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
  return inspectTemplate(kind, content)
}

export async function renderRepaymentDocument(input: {
  document: DocumentKind
  format: DocumentFormat
  dossier: RepaymentDossier
  template: Uint8Array
  email: string
  now?: Date
}): Promise<{ bytes: Uint8Array; filename: string; mimeType: string }> {
  const issue =
    input.template.byteLength > MAX_REPAYMENT_TEMPLATE_BYTES ||
    !declaresWordDocument(input.template)
      ? 'Le modèle Word est incomplet.'
      : inspectTemplate(input.document, input.template)
  if (issue) throw new RepaymentDocumentError(issue)
  const docx = renderDocx(
    input.template,
    templateData(input.dossier, input.email, input.now ?? new Date())
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

function inspectTemplate(kind: DocumentKind, content: Uint8Array): string | null {
  let zip: PizZip
  try {
    zip = new PizZip(content)
    const inspect = new InspectModule()
    new Docxtemplater(zip, {
      delimiters: { start: '{{', end: '}}' },
      linebreaks: true,
      modules: [inspect],
      paragraphLoop: true
    })
    const actual = new Set(tagPaths(inspect.getAllTags() as Record<string, unknown>))
    const expected = new Set<string>(DOCUMENT_TAGS[kind])
    const missing = DOCUMENT_TAGS[kind].find((tag) => !actual.has(tag))
    if (missing) return `Le modèle ne contient pas {{${missing}}}.`
    const unknown = [...actual].find((tag) => !expected.has(tag))
    if (unknown) return `Le modèle contient la balise inconnue {{${unknown}}}.`
  } catch {
    return 'Le modèle Word est illisible.'
  }
  return fontIssue(zip)
}

function tagPaths(tags: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(tags).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    const nested =
      value && typeof value === 'object' ? tagPaths(value as Record<string, unknown>, path) : []
    return [path, ...nested]
  })
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
  dossier: RepaymentDossier,
  email: string,
  now: Date
): Record<string, unknown> {
  const common = dossier.donnees_communes
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
  const installments = dossier.echeancier.echeances.filter(
    (row) => row.date_echeance || row.montant_en_euros != null
  )
  const balance = common.compte_locataire.solde_compte_en_euros
  const leave = adults.find((adult) => adult.date_effet_conge)?.date_effet_conge ?? null
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
    PREMIER_IMPAYE: frenchDay(common.compte_locataire.date_premier_loyer_impaye),
    STADE: '',
    BANQUE_DE_FRANCE: '',
    CCAPEX: 'Non saisie',
    CTESI: 'Non saisie',
    TRAVAILLEUR_SOCIAL: common.travailleur_social?.prenom_et_nom ?? '',
    AVENANT: '',
    CONGE: frenchDay(leave, 'Non déposé'),
    TITULAIRES: adults
      .filter((adult) => isLeaseHolder(adult.statut_bail))
      .map((adult) => ({
        PRENOM: adult.prenom ?? '',
        NOM: adult.nom ?? '',
        CAF: adult.allocataire_caf ?? ''
      })),
    ADULTES: adults.map((adult) => ({
      PRENOM: adult.prenom ?? '',
      NOM: adult.nom ?? '',
      DATE_NAISSANCE: frenchDay(adult.date_naissance),
      STATUT_PRO: adult.type_emploi ?? '',
      EMPLOYEUR: adult.employeur ?? '',
      CAF: adult.allocataire_caf ?? '',
      TITULAIRE: isLeaseHolder(adult.statut_bail) ? 'Oui' : 'Non',
      OCCUPANT: isResident(adult.mode_residence) ? 'Oui' : 'Non'
    })),
    ENFANTS: children.map((child) => ({
      PRENOM: child.prenom ?? '',
      NOM: child.nom ?? '',
      DATE_NAISSANCE: frenchDay(child.date_naissance),
      A_CHARGE: child.a_charge === 'oui' ? 'Oui' : child.a_charge === 'non' ? 'Non' : ''
    })),
    AIDES: common.aides_mobilisables
      .filter((aid) => aid.trim())
      .map((aid) => ({
        LABEL: aid.trim()
      })),
    RESSOURCES: resources.map((row) => ({
      TYPE: budgetTypeLabel(row.type),
      PERSONNE: personName(common, row.id_personne),
      MONTANT: euros(row.montant_en_euros)
    })),
    TOTAL_RESSOURCES: euros(sum(resources.map((row) => row.montant_en_euros))),
    RESSOURCES_PONCTUELLES: oneOffResources.map((row) => ({
      TYPE: budgetTypeLabel(row.type),
      PERSONNE: personName(common, row.id_personne),
      MOIS: frenchMonth(row.mois_imputation),
      MONTANT: euros(row.montant_en_euros)
    })),
    TOTAL_RESSOURCES_PONCTUELLES: euros(sum(oneOffResources.map((row) => row.montant_en_euros))),
    CHARGES: charges.map((row) => ({
      TYPE: budgetTypeLabel(row.type),
      MONTANT: euros(row.montant_en_euros)
    })),
    TOTAL_CHARGES: euros(sum(charges.map((row) => row.montant_en_euros))),
    CHARGES_PONCTUELLES: oneOffCharges.map((row) => ({
      TYPE: budgetTypeLabel(row.type),
      PERSONNE: personName(common, row.id_personne),
      MOIS: frenchMonth(row.mois_imputation),
      MONTANT: euros(row.montant_en_euros)
    })),
    TOTAL_CHARGES_PONCTUELLES: euros(sum(oneOffCharges.map((row) => row.montant_en_euros))),
    ECHEANCES: installments.map((row, index) => ({
      NUMERO: String(index + 1),
      ECHEANCE: frenchDay(row.date_echeance),
      MONTANT: euros(row.montant_en_euros)
    })),
    TOTAL_PLAN: euros(sum(installments.map((row) => row.montant_en_euros)))
  }
}

function personName(common: RepaymentDossier['donnees_communes'], id: string | null): string {
  if (id == null) return 'Foyer'
  const person = [...common.foyer.adultes, ...common.foyer.enfants].find(
    (member) => member.id_personne === id
  )
  if (!person) return ''
  return [person.prenom, person.nom].filter(Boolean).join(' ')
}

function hasAdultIdentity(
  adult: RepaymentDossier['donnees_communes']['foyer']['adultes'][number]
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
  child: RepaymentDossier['donnees_communes']['foyer']['enfants'][number]
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
