/** Longest schedule a user can enter. Confirmation thresholds stop before this. */
export const MAX_SCHEDULE_MONTHS = 36

export const HOUSING_COST = 'cout_logement_net'

export const YES_NO = [
  ['oui', 'Oui'],
  ['non', 'Non'],
  ['inconnu', 'Inconnu'],
  ['non_concerne', 'Non concerné']
] as const

export const LEASE_STATUSES = [
  ['titulaire_origine_et_actuel', 'Titulaire d’origine et actuel'],
  ['titulaire_actuel_ajoute', 'Titulaire ajouté'],
  ['ancien_titulaire', 'Ancien titulaire'],
  ['non_titulaire', 'Non titulaire'],
  ['inconnu', 'Inconnu']
] as const

export const RESIDENCE_MODES = [
  ['permanente', 'Permanente'],
  ['alternee', 'Alternée'],
  ['occasionnelle', 'Occasionnelle'],
  ['non_occupante', 'Non occupante']
] as const

export const CONTEST_STATUSES = [
  ['conteste', 'Contestée'],
  ['non_conteste', 'Non contestée'],
  ['inconnu', 'Inconnu']
] as const

export const PROOF_LEVELS = [
  ['declare', 'Déclaré'],
  ['justifie', 'Justifié']
] as const

export const CONSENTS = [
  ['accorde', 'Accordé'],
  ['refuse', 'Refusé'],
  ['non_recueilli', 'Non recueilli'],
  ['non_renseigne', 'Non renseigné']
] as const

export const DIAGNOSIS_SIGNATURES = [
  ['signe', 'Signé'],
  ['refuse', 'Refusé'],
  ['impossible', 'Impossible'],
  ['non_renseignee', 'Non renseignée']
] as const

export const HOUSING_ORIENTATIONS = [
  ['maintien', 'Maintien'],
  ['mutation', 'Mutation'],
  ['relogement', 'Relogement'],
  ['depart', 'Départ'],
  ['a_evaluer', 'À évaluer']
] as const

export const SCHEDULE_ASSESSMENTS = [
  ['soutenable', 'Soutenable'],
  ['non_soutenable', 'Non soutenable'],
  ['non_evalue', 'Non évalué']
] as const

export const PAYMENT_MODES = [
  ['prelevement', 'Prélèvement'],
  ['virement', 'Virement'],
  ['cheque', 'Chèque'],
  ['especes', 'Espèces'],
  ['autre', 'Autre']
] as const

export const CONTESTED_TREATMENTS = [
  ['non_concerne', 'Non concerné'],
  ['inclus', 'Inclus'],
  ['exclu', 'Exclu'],
  ['a_decider', 'À décider']
] as const

type Choice = readonly [string, string, string]
type Group = readonly [string, readonly Choice[]]

export const MONTHLY_INCOME = [
  [
    'Ressources d’activité',
    [
      ['salaire_net', 'Salaire net', 'CDI, CDD, intérim, alternance'],
      [
        'revenus_activite_independante',
        'Revenus d’activité indépendante',
        'auto-entreprise, entreprise, activité libérale'
      ],
      [
        'allocations_chomage',
        'Allocations chômage',
        'ARE, allocation de sécurisation professionnelle'
      ],
      [
        'indemnites_journalieres',
        'Indemnités journalières',
        'maladie, accident du travail, maternité'
      ]
    ]
  ],
  [
    'Pensions',
    [
      ['pensions_retraite', 'Pensions de retraite', 'retraite de base, complémentaire'],
      ['pensions_invalidite', 'Pensions d’invalidité', 'pension d’invalidité, rente d’incapacité'],
      [
        'pensions_alimentaires_recues',
        'Pensions alimentaires reçues',
        'pension versée pour les enfants'
      ]
    ]
  ],
  [
    'Prestations',
    [
      [
        'prestations_familiales',
        'Prestations familiales',
        'allocations familiales, complément familial, allocation de soutien familial'
      ],
      ['aides_au_logement', 'Aides au logement', 'APL, ALF, ALS'],
      ['minima_sociaux', 'Minima sociaux', 'RSA, allocation aux adultes handicapés'],
      ['prime_activite', 'Prime d’activité', 'prime d’activité']
    ]
  ],
  [
    'Autres ressources',
    [
      ['revenus_locatifs', 'Revenus locatifs', 'loyers perçus'],
      ['autres_ressources', 'Autres ressources', 'aide régulière d’un proche, autres revenus']
    ]
  ]
] as const satisfies readonly Group[]

export const ONE_OFF_INCOME = [
  ['prime_exceptionnelle', 'Prime exceptionnelle', 'prime employeur, prime de fin d’année'],
  ['rappel_prestations', 'Rappel de prestations', 'CAF, chômage, retraite'],
  [
    'indemnites_exceptionnelles',
    'Indemnités exceptionnelles',
    'indemnisation, dommages et intérêts'
  ],
  ['heritage_donation', 'Héritage et donation', 'succession, don familial'],
  ['vente_bien', 'Vente d’un bien', 'véhicule, mobilier, autre bien'],
  ['aide_exceptionnelle', 'Aide exceptionnelle', 'aide familiale, aide d’une association'],
  ['deblocage_epargne', 'Déblocage d’épargne', 'livret, épargne salariale'],
  [
    'remboursement_exceptionnel',
    'Remboursement exceptionnel',
    'trop-perçu d’impôts, remboursement de frais'
  ],
  [
    'autres_ressources_ponctuelles',
    'Autres ressources ponctuelles',
    'rentrée d’argent exceptionnelle non couverte'
  ]
] as const satisfies readonly Choice[]

export const MONTHLY_EXPENSES = [
  [
    'cout_logement_net',
    'Loyer + Charges - Aides au logement',
    'loyer et charges, déduction faite des aides'
  ],
  ['credits_en_cours', 'Crédits en cours', 'immobilier, consommation, automobile'],
  ['assurance_habitation', 'Assurance habitation', 'multirisque, assurance locative'],
  ['sante', 'Santé', 'mutuelle, frais médicaux réguliers'],
  ['energie_eau', 'Énergie et fluide', 'électricité, gaz, eau'],
  ['telecommunications', 'Télécommunications', 'téléphone, internet, télévision'],
  ['transport', 'Transport', 'transports en commun, carburant, assurance automobile'],
  ['alimentation', 'Alimentation', 'courses alimentaires, produits courants'],
  ['garde_scolarite', 'Garde et scolarité', 'crèche, cantine, garde d’enfants'],
  [
    'pensions_alimentaires',
    'Pensions alimentaires',
    'pensions versées aux enfants ou à l’ex-conjoint'
  ],
  ['impots', 'Impôts', 'taxe foncière et autres'],
  ['abonnements', 'Abonnements', 'plateformes, services, adhésions'],
  ['autres_charges', 'Autres charges', 'dépenses récurrentes non couvertes']
] as const satisfies readonly Choice[]

export const ONE_OFF_EXPENSES = [
  ['dette_a_rembourser', 'Dette à rembourser', 'dette familiale, crédit impayé, autre dette'],
  ['sante_ponctuelle', 'Santé', 'soins dentaires, lunettes, frais médicaux exceptionnels'],
  ['vehicule', 'Véhicule', 'réparation, entretien, contrôle technique'],
  ['logement', 'Logement', 'réparation, mobilier, équipement indispensable'],
  ['energie_eau_ponctuelle', 'Énergie et fluide', 'régularisation de facture, impayé'],
  ['impots_ponctuels', 'Impôts', 'rappel, régularisation fiscale'],
  ['justice', 'Justice', 'frais d’avocat, frais de procédure'],
  ['enfants', 'Enfants', 'rentrée scolaire, équipement, dépense exceptionnelle'],
  ['demenagement', 'Déménagement', 'transport, dépôt de garantie, frais d’installation'],
  ['famille', 'Famille', 'frais exceptionnels liés à un proche'],
  ['autres_depenses', 'Autres dépenses', 'dépense exceptionnelle non couverte']
] as const satisfies readonly Choice[]

const BUDGET_LABELS = new Map<string, string>([
  ...MONTHLY_INCOME.flatMap(([, rows]) => rows.map(([code, label]) => [code, label] as const)),
  ...ONE_OFF_INCOME.map(([code, label]) => [code, label] as const),
  ...MONTHLY_EXPENSES.map(([code, label]) => [code, label] as const),
  ...ONE_OFF_EXPENSES.map(([code, label]) => [code, label] as const)
])

export function budgetTypeLabel(code: string | null): string {
  if (!code) return ''
  return BUDGET_LABELS.get(code) ?? code
}

type Code = readonly (readonly [string, string, ...string[]])[]

export type YesNo = (typeof YES_NO)[number][0]
export type LeaseStatus = (typeof LEASE_STATUSES)[number][0]
export type ResidenceMode = (typeof RESIDENCE_MODES)[number][0]
export type ContestStatus = (typeof CONTEST_STATUSES)[number][0]
export type ProofLevel = (typeof PROOF_LEVELS)[number][0]
export type Consent = (typeof CONSENTS)[number][0]
export type DiagnosisSignature = (typeof DIAGNOSIS_SIGNATURES)[number][0]
export type HousingOrientation = (typeof HOUSING_ORIENTATIONS)[number][0]
export type ScheduleAssessment = (typeof SCHEDULE_ASSESSMENTS)[number][0]
export type PaymentMode = (typeof PAYMENT_MODES)[number][0]
export type ContestedTreatment = (typeof CONTESTED_TREATMENTS)[number][0]

export type Address = {
  adresse: string | null
  code_postal: string | null
  commune: string | null
}

export type Guarantor = { prenom: string | null; nom: string | null }

export type SocialWorker = {
  prenom_et_nom: string | null
  organisme: string | null
  coordonnees: string | null
}

export type Adult = {
  id_personne: string
  prenom: string | null
  nom: string | null
  date_naissance: string | null
  type_emploi: string | null
  employeur: string | null
  allocataire_caf: string | null
  adresse_correspondance: Address | null
  statut_bail: LeaseStatus
  mode_residence: ResidenceMode | null
  date_effet_conge: string | null
  remplacement_cotitulaire: YesNo
  date_entree_nouveau_cotitulaire: string | null
  date_fin_solidarite: string | null
}

export type Child = {
  id_personne: string
  prenom: string | null
  nom: string | null
  date_naissance: string | null
  a_charge: YesNo
  mode_residence: ResidenceMode | null
}

export type MonthlyLine = {
  type: string | null
  id_personne: string | null
  montant_en_euros: number | null
  date_debut: string | null
  date_fin: string | null
  niveau_preuve: ProofLevel | null
  date_niveau_preuve: string | null
}

export type OneOffLine = {
  type: string | null
  id_personne: string | null
  montant_en_euros: number | null
  mois_imputation: string | null
  niveau_preuve: ProofLevel | null
  date_niveau_preuve: string | null
}

export type Installment = {
  date_echeance: string | null
  montant_en_euros: number | null
  ressources_totales_du_mois_en_euros: number | null
  charges_totales_du_mois_en_euros: number | null
  unites_de_consommation: number | null
  taux_effort_loyer_net: number | null
  reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros: number | null
  taux_effort_global: number | null
  reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros: number | null
}

export type Schedule = {
  traitement_montant_conteste: ContestedTreatment
  inclure_ancienne_dette_locative: boolean
  montant_a_apurer_en_euros: number | null
  echeances: Installment[]
}

export type CommonData = {
  version: 1
  identification: { id_client: string | null; id_locataire: string | null; id_lot: string | null }
  logement: Address
  bail: { debut_bail: string | null; garant: Guarantor | null }
  foyer: { adultes: Adult[]; enfants: Child[] }
  compte_locataire: {
    solde_compte_en_euros: number | null
    date_arrete_compte: string | null
    date_premier_loyer_impaye: string | null
    statut_contestation: ContestStatus
    montant_conteste_en_euros: number | null
    motif_contestation: string | null
    motifs_impaye: string[]
    ancienne_dette_hors_solde_en_euros: number | null
  }
  budget: {
    ressources_mensuelles: MonthlyLine[]
    ressources_ponctuelles: OneOffLine[]
    charges_mensuelles: MonthlyLine[]
    charges_ponctuelles: OneOffLine[]
  }
  travailleur_social: SocialWorker | null
  aides_mobilisables: string[]
}

export type SocialFinancialDiagnosis = {
  version: 1
  menage_informe_du_dsf: YesNo
  consentement_recherche_pour_dsf: Consent
  signature_diagnostic_par_menage: DiagnosisSignature
  position_et_solutions_proposees_par_menage: string | null
  observations_bailleur: string | null
  vulnerabilites: string[]
  impact_vulnerabilites: string | null
  orientation_logement: { orientation: HousingOrientation; motifs: string | null }
  appreciation_echeancier: ScheduleAssessment
  motif_non_soutenabilite: string | null
  synthese_professionnelle: string | null
}

export type SettlementPlan = {
  version: 1
  accord_bailleur: YesNo
  accord_menage: YesNo
  date_accord: string | null
  mode_de_paiement_echeances: PaymentMode | null
}

export type SocialCohesionProtocol = { version: 1 }

export type RepaymentForms = {
  donnees_communes: CommonData
  diagnostic_social_financier: SocialFinancialDiagnosis
  plan_apurement: SettlementPlan
  protocole_cohesion_sociale: SocialCohesionProtocol
  echeancier: Schedule
}

export type ReadResult<T> = { ok: true; value: T } | { ok: false; error: string }

const REPAYMENT_PLAN_EVENT_TYPES = [
  'repayment_plan.created',
  'repayment_plan.updated',
  'repayment_plan.finalized',
  'repayment_plan.closed'
] as const

export type RepaymentPlanEventType = (typeof REPAYMENT_PLAN_EVENT_TYPES)[number]

export const isRepaymentPlanEventType = (type: string): type is RepaymentPlanEventType =>
  (REPAYMENT_PLAN_EVENT_TYPES as readonly string[]).includes(type)

const LEASE_HOLDERS = new Set<LeaseStatus>([
  'titulaire_origine_et_actuel',
  'titulaire_actuel_ajoute',
  'ancien_titulaire'
])

export function isLeaseHolder(status: LeaseStatus | null): boolean {
  return status != null && LEASE_HOLDERS.has(status)
}

export function isResident(mode: ResidenceMode | null): boolean {
  return mode === 'permanente' || mode === 'alternee'
}

class FormError extends Error {}

function fail(message: string): never {
  throw new FormError(message)
}

function read<T>(parse: () => T): ReadResult<T> {
  try {
    return { ok: true, value: parse() }
  } catch (error) {
    if (error instanceof FormError) return { ok: false, error: error.message }
    throw error
  }
}

function object(value: unknown, fields: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} illisible.`)
  const record = value as Record<string, unknown>
  if (Object.keys(record).some((key) => !fields.includes(key))) {
    fail(`${label} contient une clé inconnue.`)
  }
  if (fields.some((field) => !Object.hasOwn(record, field))) fail(`${label} est incomplet.`)
  return record
}

function text(value: unknown, label: string): string | null {
  if (value === null) return null
  if (typeof value !== 'string' || value.trim() === '' || value !== value.trim()) {
    fail(`${label} est illisible.`)
  }
  return value
}

function day(value: unknown, label: string): string | null {
  const parsed = text(value, label)
  if (parsed == null) return null
  if (!calendar(parsed)) fail(`${label} est illisible.`)
  return parsed
}

function month(value: unknown, label: string): string | null {
  const parsed = text(value, label)
  if (parsed == null) return null
  if (!/^\d{4}-\d{2}$/.test(parsed) || !calendar(`${parsed}-01`)) fail(`${label} est illisible.`)
  return parsed
}

function calendar(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return false
  const year = Number(match[1])
  const monthIndex = Number(match[2])
  const date = Number(match[3])
  const utc = new Date(Date.UTC(year, monthIndex - 1, date))
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === monthIndex - 1 &&
    utc.getUTCDate() === date
  )
}

function euros(value: unknown, label: string): number | null {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${label} est illisible.`)
  const cents = Math.round(value * 100)
  if (Math.abs(value * 100 - cents) > 1e-6) fail(`${label} est illisible.`)
  return cents / 100
}

function figure(value: unknown, label: string): number | null {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${label} est illisible.`)
  return value
}

function code<T extends string>(value: unknown, options: Code, label: string): T {
  if (typeof value === 'string' && options.some(([option]) => option === value)) return value as T
  fail(`${label} est illisible.`)
}

function optionalCode<T extends string>(value: unknown, options: Code, label: string): T | null {
  if (value === null) return null
  return code(value, options, label)
}

function labels(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) fail(`${label} est illisible.`)
  return value.map((item) => {
    const parsed = text(item, label)
    if (parsed == null) fail(`${label} est illisible.`)
    return parsed
  })
}

function version(value: unknown): 1 {
  if (value !== 1) fail('Version illisible.')
  return 1
}

function address(value: unknown, label: string): Address {
  const record = object(value, ['adresse', 'code_postal', 'commune'], label)
  return {
    adresse: text(record['adresse'], label),
    code_postal: text(record['code_postal'], label),
    commune: text(record['commune'], label)
  }
}

function personId(value: unknown): string {
  const parsed = text(value, 'Identifiant de personne')
  if (parsed == null) fail('Identifiant de personne manquant.')
  return parsed
}

function monthlyLine(value: unknown): MonthlyLine {
  const record = object(
    value,
    [
      'type',
      'id_personne',
      'montant_en_euros',
      'date_debut',
      'date_fin',
      'niveau_preuve',
      'date_niveau_preuve'
    ],
    'Ligne budgétaire'
  )
  return {
    type: text(record['type'], 'Type budgétaire'),
    id_personne: text(record['id_personne'], 'Personne'),
    montant_en_euros: euros(record['montant_en_euros'], 'Montant'),
    date_debut: day(record['date_debut'], 'Début'),
    date_fin: day(record['date_fin'], 'Fin'),
    niveau_preuve: optionalCode(record['niveau_preuve'], PROOF_LEVELS, 'Niveau de preuve'),
    date_niveau_preuve: day(record['date_niveau_preuve'], 'Date de preuve')
  }
}

function oneOffLine(value: unknown): OneOffLine {
  const record = object(
    value,
    [
      'type',
      'id_personne',
      'montant_en_euros',
      'mois_imputation',
      'niveau_preuve',
      'date_niveau_preuve'
    ],
    'Ligne budgétaire'
  )
  return {
    type: text(record['type'], 'Type budgétaire'),
    id_personne: text(record['id_personne'], 'Personne'),
    montant_en_euros: euros(record['montant_en_euros'], 'Montant'),
    mois_imputation: month(record['mois_imputation'], 'Mois d’imputation'),
    niveau_preuve: optionalCode(record['niveau_preuve'], PROOF_LEVELS, 'Niveau de preuve'),
    date_niveau_preuve: day(record['date_niveau_preuve'], 'Date de preuve')
  }
}

function installment(value: unknown): Installment {
  const record = object(
    value,
    [
      'date_echeance',
      'montant_en_euros',
      'ressources_totales_du_mois_en_euros',
      'charges_totales_du_mois_en_euros',
      'unites_de_consommation',
      'taux_effort_loyer_net',
      'reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros',
      'taux_effort_global',
      'reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros'
    ],
    'Échéance'
  )
  return {
    date_echeance: day(record['date_echeance'], 'Date d’échéance'),
    montant_en_euros: euros(record['montant_en_euros'], 'Mensualité'),
    ressources_totales_du_mois_en_euros: euros(
      record['ressources_totales_du_mois_en_euros'],
      'Ressources'
    ),
    charges_totales_du_mois_en_euros: euros(record['charges_totales_du_mois_en_euros'], 'Charges'),
    unites_de_consommation: figure(record['unites_de_consommation'], 'Unités de consommation'),
    taux_effort_loyer_net: figure(record['taux_effort_loyer_net'], 'Taux d’effort'),
    reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros: euros(
      record['reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros'],
      'Reste à vivre'
    ),
    taux_effort_global: figure(record['taux_effort_global'], 'Taux d’effort'),
    reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros: euros(
      record['reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros'],
      'Reste à vivre'
    )
  }
}

function schedule(value: unknown): Schedule {
  const record = object(
    value,
    [
      'traitement_montant_conteste',
      'inclure_ancienne_dette_locative',
      'montant_a_apurer_en_euros',
      'echeances'
    ],
    'Échéancier'
  )
  if (!Array.isArray(record['echeances']) || record['echeances'].length > MAX_SCHEDULE_MONTHS) {
    fail('Échéancier illisible.')
  }
  if (typeof record['inclure_ancienne_dette_locative'] !== 'boolean') {
    fail('Ancienne dette illisible.')
  }
  return {
    traitement_montant_conteste: code(
      record['traitement_montant_conteste'],
      CONTESTED_TREATMENTS,
      'Contestation'
    ),
    inclure_ancienne_dette_locative: record['inclure_ancienne_dette_locative'],
    montant_a_apurer_en_euros: euros(record['montant_a_apurer_en_euros'], 'Montant à apurer'),
    echeances: record['echeances'].map(installment)
  }
}

function knownPeople(ids: ReadonlySet<string>, line: { id_personne: string | null }): void {
  if (line.id_personne != null && !ids.has(line.id_personne))
    fail('Personne inconnue dans le budget.')
}

export function readCommonData(value: unknown): ReadResult<CommonData> {
  return read(() => commonData(value))
}

function commonData(value: unknown): CommonData {
  const record = object(
    value,
    [
      'version',
      'identification',
      'logement',
      'bail',
      'foyer',
      'compte_locataire',
      'budget',
      'travailleur_social',
      'aides_mobilisables'
    ],
    'Données communes'
  )
  const identification = object(
    record['identification'],
    ['id_client', 'id_locataire', 'id_lot'],
    'Identification'
  )
  const bail = object(record['bail'], ['debut_bail', 'garant'], 'Bail')
  const foyer = object(record['foyer'], ['adultes', 'enfants'], 'Foyer')
  const compte = object(
    record['compte_locataire'],
    [
      'solde_compte_en_euros',
      'date_arrete_compte',
      'date_premier_loyer_impaye',
      'statut_contestation',
      'montant_conteste_en_euros',
      'motif_contestation',
      'motifs_impaye',
      'ancienne_dette_hors_solde_en_euros'
    ],
    'Compte locataire'
  )
  const budget = object(
    record['budget'],
    [
      'ressources_mensuelles',
      'ressources_ponctuelles',
      'charges_mensuelles',
      'charges_ponctuelles'
    ],
    'Budget'
  )
  if (!Array.isArray(foyer['adultes']) || !Array.isArray(foyer['enfants'])) fail('Foyer illisible.')
  if (
    !Array.isArray(budget['ressources_mensuelles']) ||
    !Array.isArray(budget['ressources_ponctuelles']) ||
    !Array.isArray(budget['charges_mensuelles']) ||
    !Array.isArray(budget['charges_ponctuelles'])
  ) {
    fail('Budget illisible.')
  }
  const adultes = foyer['adultes'].map(adult)
  const enfants = foyer['enfants'].map(child)
  const ids = new Set<string>()
  for (const person of [...adultes, ...enfants]) {
    if (ids.has(person.id_personne)) fail('Identifiant de personne en double.')
    ids.add(person.id_personne)
  }
  const ressources_mensuelles = budget['ressources_mensuelles'].map(monthlyLine)
  const ressources_ponctuelles = budget['ressources_ponctuelles'].map(oneOffLine)
  const charges_mensuelles = budget['charges_mensuelles'].map(monthlyLine)
  const charges_ponctuelles = budget['charges_ponctuelles'].map(oneOffLine)
  for (const line of [
    ...ressources_mensuelles,
    ...ressources_ponctuelles,
    ...charges_mensuelles,
    ...charges_ponctuelles
  ]) {
    knownPeople(ids, line)
  }
  const statut_contestation = code<ContestStatus>(
    compte['statut_contestation'],
    CONTEST_STATUSES,
    'Contestation'
  )
  const montant_conteste_en_euros = euros(compte['montant_conteste_en_euros'], 'Montant contesté')
  const motif_contestation = text(compte['motif_contestation'], 'Motif de contestation')
  if (
    statut_contestation === 'non_conteste' &&
    (montant_conteste_en_euros !== 0 || motif_contestation != null)
  ) {
    fail('Contestation incohérente.')
  }
  if (
    statut_contestation === 'conteste' &&
    (!(montant_conteste_en_euros != null && montant_conteste_en_euros > 0) ||
      motif_contestation == null)
  ) {
    fail('Contestation incohérente.')
  }
  if (
    statut_contestation === 'inconnu' &&
    (montant_conteste_en_euros != null || motif_contestation != null)
  ) {
    fail('Contestation incohérente.')
  }
  const garant = bail['garant'] == null ? null : guarantor(bail['garant'])
  return {
    version: version(record['version']),
    identification: {
      id_client: text(identification['id_client'], 'Identifiant client'),
      id_locataire: text(identification['id_locataire'], 'Identifiant locataire'),
      id_lot: text(identification['id_lot'], 'Identifiant logement')
    },
    logement: address(record['logement'], 'Logement'),
    bail: { debut_bail: day(bail['debut_bail'], 'Début du bail'), garant },
    foyer: { adultes, enfants },
    compte_locataire: {
      solde_compte_en_euros: euros(compte['solde_compte_en_euros'], 'Solde'),
      date_arrete_compte: day(compte['date_arrete_compte'], 'Date d’arrêté'),
      date_premier_loyer_impaye: day(compte['date_premier_loyer_impaye'], 'Premier impayé'),
      statut_contestation,
      montant_conteste_en_euros,
      motif_contestation,
      motifs_impaye: labels(compte['motifs_impaye'], 'Motif d’impayé'),
      ancienne_dette_hors_solde_en_euros: euros(
        compte['ancienne_dette_hors_solde_en_euros'],
        'Ancienne dette'
      )
    },
    budget: {
      ressources_mensuelles,
      ressources_ponctuelles,
      charges_mensuelles,
      charges_ponctuelles
    },
    travailleur_social:
      record['travailleur_social'] == null ? null : socialWorker(record['travailleur_social']),
    aides_mobilisables: labels(record['aides_mobilisables'], 'Aide')
  }
}

function adult(value: unknown): Adult {
  const record = object(
    value,
    [
      'id_personne',
      'prenom',
      'nom',
      'date_naissance',
      'type_emploi',
      'employeur',
      'allocataire_caf',
      'adresse_correspondance',
      'statut_bail',
      'mode_residence',
      'date_effet_conge',
      'remplacement_cotitulaire',
      'date_entree_nouveau_cotitulaire',
      'date_fin_solidarite'
    ],
    'Adulte'
  )
  return {
    id_personne: personId(record['id_personne']),
    prenom: text(record['prenom'], 'Prénom'),
    nom: text(record['nom'], 'Nom'),
    date_naissance: day(record['date_naissance'], 'Naissance'),
    type_emploi: text(record['type_emploi'], 'Emploi'),
    employeur: text(record['employeur'], 'Employeur'),
    allocataire_caf: text(record['allocataire_caf'], 'Allocataire CAF'),
    adresse_correspondance:
      record['adresse_correspondance'] == null
        ? null
        : address(record['adresse_correspondance'], 'Adresse de correspondance'),
    statut_bail: code(record['statut_bail'], LEASE_STATUSES, 'Statut du bail'),
    mode_residence: optionalCode(record['mode_residence'], RESIDENCE_MODES, 'Résidence'),
    date_effet_conge: day(record['date_effet_conge'], 'Effet du congé'),
    remplacement_cotitulaire: code(record['remplacement_cotitulaire'], YES_NO, 'Remplacement'),
    date_entree_nouveau_cotitulaire: day(
      record['date_entree_nouveau_cotitulaire'],
      'Entrée du cotitulaire'
    ),
    date_fin_solidarite: day(record['date_fin_solidarite'], 'Fin de solidarité')
  }
}

function child(value: unknown): Child {
  const record = object(
    value,
    ['id_personne', 'prenom', 'nom', 'date_naissance', 'a_charge', 'mode_residence'],
    'Enfant'
  )
  return {
    id_personne: personId(record['id_personne']),
    prenom: text(record['prenom'], 'Prénom'),
    nom: text(record['nom'], 'Nom'),
    date_naissance: day(record['date_naissance'], 'Naissance'),
    a_charge: code(record['a_charge'], YES_NO, 'À charge'),
    mode_residence: optionalCode(record['mode_residence'], RESIDENCE_MODES, 'Résidence')
  }
}

function guarantor(value: unknown): Guarantor {
  const record = object(value, ['prenom', 'nom'], 'Garant')
  return { prenom: text(record['prenom'], 'Prénom'), nom: text(record['nom'], 'Nom') }
}

function socialWorker(value: unknown): SocialWorker {
  const record = object(value, ['prenom_et_nom', 'organisme', 'coordonnees'], 'Travailleur social')
  return {
    prenom_et_nom: text(record['prenom_et_nom'], 'Travailleur social'),
    organisme: text(record['organisme'], 'Organisme'),
    coordonnees: text(record['coordonnees'], 'Coordonnées')
  }
}

export function readSocialFinancialDiagnosis(value: unknown): ReadResult<SocialFinancialDiagnosis> {
  return read(() => diagnosis(value))
}

function diagnosis(value: unknown): SocialFinancialDiagnosis {
  const record = object(
    value,
    [
      'version',
      'menage_informe_du_dsf',
      'consentement_recherche_pour_dsf',
      'signature_diagnostic_par_menage',
      'position_et_solutions_proposees_par_menage',
      'observations_bailleur',
      'vulnerabilites',
      'impact_vulnerabilites',
      'orientation_logement',
      'appreciation_echeancier',
      'motif_non_soutenabilite',
      'synthese_professionnelle'
    ],
    'Diagnostic'
  )
  const orientation = object(
    record['orientation_logement'],
    ['orientation', 'motifs'],
    'Orientation'
  )
  const appreciation = code<ScheduleAssessment>(
    record['appreciation_echeancier'],
    SCHEDULE_ASSESSMENTS,
    'Appréciation'
  )
  const motif = text(record['motif_non_soutenabilite'], 'Motif')
  if (appreciation === 'non_soutenable' && motif == null)
    fail('Motif de non-soutenabilité manquant.')
  if (appreciation !== 'non_soutenable' && motif != null)
    fail('Motif de non-soutenabilité inattendu.')
  return {
    version: version(record['version']),
    menage_informe_du_dsf: code(record['menage_informe_du_dsf'], YES_NO, 'Information du ménage'),
    consentement_recherche_pour_dsf: code(
      record['consentement_recherche_pour_dsf'],
      CONSENTS,
      'Consentement'
    ),
    signature_diagnostic_par_menage: code(
      record['signature_diagnostic_par_menage'],
      DIAGNOSIS_SIGNATURES,
      'Signature'
    ),
    position_et_solutions_proposees_par_menage: text(
      record['position_et_solutions_proposees_par_menage'],
      'Position'
    ),
    observations_bailleur: text(record['observations_bailleur'], 'Observations'),
    vulnerabilites: labels(record['vulnerabilites'], 'Vulnérabilité'),
    impact_vulnerabilites: text(record['impact_vulnerabilites'], 'Impact'),
    orientation_logement: {
      orientation: code(orientation['orientation'], HOUSING_ORIENTATIONS, 'Orientation'),
      motifs: text(orientation['motifs'], 'Motifs')
    },
    appreciation_echeancier: appreciation,
    motif_non_soutenabilite: motif,
    synthese_professionnelle: text(record['synthese_professionnelle'], 'Synthèse')
  }
}

export function readSettlementPlan(value: unknown): ReadResult<SettlementPlan> {
  return read(() => settlementPlan(value))
}

function settlementPlan(value: unknown): SettlementPlan {
  const record = object(
    value,
    ['version', 'accord_bailleur', 'accord_menage', 'date_accord', 'mode_de_paiement_echeances'],
    'Plan d’apurement'
  )
  const accord_bailleur = code<YesNo>(record['accord_bailleur'], YES_NO, 'Accord du bailleur')
  const accord_menage = code<YesNo>(record['accord_menage'], YES_NO, 'Accord du ménage')
  const date_accord = day(record['date_accord'], 'Date d’accord')
  const accepted = accord_bailleur === 'oui' && accord_menage === 'oui'
  if (accepted && date_accord == null) fail('Date d’accord manquante.')
  if (!accepted && date_accord != null) fail('Date d’accord inattendue.')
  return {
    version: version(record['version']),
    accord_bailleur,
    accord_menage,
    date_accord,
    mode_de_paiement_echeances: optionalCode(
      record['mode_de_paiement_echeances'],
      PAYMENT_MODES,
      'Paiement'
    )
  }
}

export function readSocialCohesionProtocol(value: unknown): ReadResult<SocialCohesionProtocol> {
  return read(() => protocol(value))
}

function protocol(value: unknown): SocialCohesionProtocol {
  const record = object(value, ['version'], 'Protocole')
  return { version: version(record['version']) }
}

export function readRepaymentForms(value: unknown): ReadResult<RepaymentForms> {
  return read(() => {
    const record = object(
      value,
      [
        'donnees_communes',
        'diagnostic_social_financier',
        'plan_apurement',
        'protocole_cohesion_sociale',
        'echeancier'
      ],
      'Formulaires'
    )
    return {
      donnees_communes: commonData(record['donnees_communes']),
      diagnostic_social_financier: diagnosis(record['diagnostic_social_financier']),
      plan_apurement: settlementPlan(record['plan_apurement']),
      protocole_cohesion_sociale: protocol(record['protocole_cohesion_sociale']),
      echeancier: schedule(record['echeancier'])
    }
  })
}

export function parseRepaymentPlanContent(type: string, raw: string): RepaymentForms | null {
  if (!isRepaymentPlanEventType(type)) return null
  try {
    const parsed = readRepaymentForms(JSON.parse(raw) as unknown)
    return parsed.ok ? parsed.value : null
  } catch {
    return null
  }
}

export function blankAddress(): Address {
  return { adresse: null, code_postal: null, commune: null }
}

export function blankMonthlyLine(): MonthlyLine {
  return {
    type: null,
    id_personne: null,
    montant_en_euros: null,
    date_debut: null,
    date_fin: null,
    niveau_preuve: null,
    date_niveau_preuve: null
  }
}

export function blankOneOffLine(): OneOffLine {
  return {
    type: null,
    id_personne: null,
    montant_en_euros: null,
    mois_imputation: null,
    niveau_preuve: null,
    date_niveau_preuve: null
  }
}

export function blankInstallment(
  date: string | null = null,
  amount: number | null = null
): Installment {
  return {
    date_echeance: date,
    montant_en_euros: amount,
    ressources_totales_du_mois_en_euros: null,
    charges_totales_du_mois_en_euros: null,
    unites_de_consommation: null,
    taux_effort_loyer_net: null,
    reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros: null,
    taux_effort_global: null,
    reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros: null
  }
}

export function blankSchedule(): Schedule {
  return {
    traitement_montant_conteste: 'non_concerne',
    inclure_ancienne_dette_locative: false,
    montant_a_apurer_en_euros: null,
    echeances: []
  }
}

export function blankAdult(id = 'personne_1'): Adult {
  return {
    id_personne: id,
    prenom: null,
    nom: null,
    date_naissance: null,
    type_emploi: null,
    employeur: null,
    allocataire_caf: null,
    adresse_correspondance: null,
    statut_bail: 'inconnu',
    mode_residence: null,
    date_effet_conge: null,
    remplacement_cotitulaire: 'non_concerne',
    date_entree_nouveau_cotitulaire: null,
    date_fin_solidarite: null
  }
}

export function blankChild(id: string): Child {
  return {
    id_personne: id,
    prenom: null,
    nom: null,
    date_naissance: null,
    a_charge: 'inconnu',
    mode_residence: null
  }
}

export function emptyRepaymentForms(): RepaymentForms {
  const housing = blankMonthlyLine()
  housing.type = HOUSING_COST
  return {
    donnees_communes: {
      version: 1,
      identification: { id_client: null, id_locataire: null, id_lot: null },
      logement: blankAddress(),
      bail: { debut_bail: null, garant: null },
      foyer: { adultes: [blankAdult()], enfants: [] },
      compte_locataire: {
        solde_compte_en_euros: null,
        date_arrete_compte: null,
        date_premier_loyer_impaye: null,
        statut_contestation: 'inconnu',
        montant_conteste_en_euros: null,
        motif_contestation: null,
        motifs_impaye: [],
        ancienne_dette_hors_solde_en_euros: null
      },
      budget: {
        ressources_mensuelles: [blankMonthlyLine()],
        ressources_ponctuelles: [blankOneOffLine()],
        charges_mensuelles: [housing],
        charges_ponctuelles: [blankOneOffLine()]
      },
      travailleur_social: null,
      aides_mobilisables: []
    },
    diagnostic_social_financier: {
      version: 1,
      menage_informe_du_dsf: 'inconnu',
      consentement_recherche_pour_dsf: 'non_renseigne',
      signature_diagnostic_par_menage: 'non_renseignee',
      position_et_solutions_proposees_par_menage: null,
      observations_bailleur: null,
      vulnerabilites: [],
      impact_vulnerabilites: null,
      orientation_logement: { orientation: 'a_evaluer', motifs: null },
      appreciation_echeancier: 'non_evalue',
      motif_non_soutenabilite: null,
      synthese_professionnelle: null
    },
    plan_apurement: {
      version: 1,
      accord_bailleur: 'inconnu',
      accord_menage: 'inconnu',
      date_accord: null,
      mode_de_paiement_echeances: null
    },
    protocole_cohesion_sociale: { version: 1 },
    echeancier: blankSchedule()
  }
}

export function nextPersonId(foyer: CommonData['foyer']): string {
  const used = new Set([...foyer.adultes, ...foyer.enfants].map((person) => person.id_personne))
  let index = 1
  while (used.has(`personne_${index}`)) index += 1
  return `personne_${index}`
}

export function calculatedSolidarityEnd(adult: Adult): string | null {
  if (!isLeaseHolder(adult.statut_bail)) return null
  if (adult.remplacement_cotitulaire === 'oui') {
    if (!adult.date_effet_conge || !adult.date_entree_nouveau_cotitulaire) return null
    return adult.date_effet_conge > adult.date_entree_nouveau_cotitulaire
      ? adult.date_effet_conge
      : adult.date_entree_nouveau_cotitulaire
  }
  if (adult.remplacement_cotitulaire === 'non' && adult.date_effet_conge) {
    return addMonths(adult.date_effet_conge, 6)
  }
  return null
}

function addMonths(iso: string, months: number): string {
  const year = Number(iso.slice(0, 4))
  const month = Number(iso.slice(5, 7))
  const day = Number(iso.slice(8, 10))
  const absolute = year * 12 + (month - 1) + months
  const targetYear = Math.floor(absolute / 12)
  const targetMonth = (absolute % 12) + 1
  const last = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  return isoDate(targetYear, targetMonth, Math.min(day, last))
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function amountToSettle(
  common: CommonData,
  schedule: Pick<Schedule, 'traitement_montant_conteste' | 'inclure_ancienne_dette_locative'>
): number | null {
  if (schedule.traitement_montant_conteste === 'a_decider') return null
  const balance = common.compte_locataire.solde_compte_en_euros
  if (balance == null) return null
  let cents = Math.max(centsOf(balance), 0)
  if (schedule.traitement_montant_conteste === 'exclu') {
    const contested = common.compte_locataire.montant_conteste_en_euros
    if (common.compte_locataire.statut_contestation === 'inconnu' || contested == null) return null
    cents -= centsOf(contested)
  }
  if (schedule.inclure_ancienne_dette_locative) {
    const previous = common.compte_locataire.ancienne_dette_hors_solde_en_euros
    if (previous == null) return null
    cents += centsOf(previous)
  }
  return Math.max(cents, 0) / 100
}

function centsOf(value: number): number {
  return Math.round(value * 100)
}

type MetricFields = Pick<
  Installment,
  | 'ressources_totales_du_mois_en_euros'
  | 'charges_totales_du_mois_en_euros'
  | 'unites_de_consommation'
  | 'taux_effort_loyer_net'
  | 'reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros'
  | 'taux_effort_global'
  | 'reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros'
>

const EMPTY_METRICS: MetricFields = {
  ressources_totales_du_mois_en_euros: null,
  charges_totales_du_mois_en_euros: null,
  unites_de_consommation: null,
  taux_effort_loyer_net: null,
  reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros: null,
  taux_effort_global: null,
  reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros: null
}

export function installmentMetrics(
  common: CommonData,
  row: Pick<Installment, 'date_echeance' | 'montant_en_euros'>
): MetricFields {
  const on = row.date_echeance
  if (!on) return { ...EMPTY_METRICS }
  const resources = monthCents(
    common.budget.ressources_mensuelles,
    common.budget.ressources_ponctuelles,
    on,
    'zero'
  )
  const charges = monthCents(
    common.budget.charges_mensuelles,
    common.budget.charges_ponctuelles,
    on,
    'zero'
  )
  const housing = monthCents(
    common.budget.charges_mensuelles.filter((line) => line.type === HOUSING_COST),
    common.budget.charges_ponctuelles.filter((line) => line.type === HOUSING_COST),
    on,
    'null'
  )
  const units = consumptionUnits(common, on)
  const payment = row.montant_en_euros == null ? null : centsOf(row.montant_en_euros)
  return {
    ressources_totales_du_mois_en_euros: fromCents(resources),
    charges_totales_du_mois_en_euros: fromCents(charges),
    unites_de_consommation: units,
    taux_effort_loyer_net: ratio(housing, payment, resources),
    reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros: remainder(
      resources,
      housing,
      payment,
      units
    ),
    taux_effort_global: ratio(charges, payment, resources),
    reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros: remainder(
      resources,
      charges,
      payment,
      units
    )
  }
}

function fromCents(cents: number | null): number | null {
  return cents == null ? null : cents / 100
}

function ratio(
  base: number | null,
  payment: number | null,
  resources: number | null
): number | null {
  if (base == null || payment == null || resources == null || resources === 0) return null
  return Math.round(((base + payment) / resources) * 1e6) / 1e6
}

function remainder(
  resources: number | null,
  cost: number | null,
  payment: number | null,
  units: number | null
): number | null {
  if (resources == null || cost == null || payment == null || units == null || units === 0)
    return null
  return Math.round(((resources - cost - payment) / (100 * units * 30)) * 100) / 100
}

function monthCents(
  monthly: readonly MonthlyLine[],
  oneOff: readonly OneOffLine[],
  on: string,
  absent: 'zero' | 'null'
): number | null {
  let total = 0
  let seen = false
  for (const line of monthly) {
    if (ghostMonthly(line) || !covers(line.date_debut, line.date_fin, on)) continue
    if (line.montant_en_euros == null) return null
    seen = true
    total += centsOf(line.montant_en_euros)
  }
  for (const line of oneOff) {
    if (ghostOneOff(line) || line.mois_imputation !== on.slice(0, 7)) continue
    if (line.montant_en_euros == null) return null
    seen = true
    total += centsOf(line.montant_en_euros)
  }
  if (!seen) return absent === 'zero' ? 0 : null
  return total
}

function ghostMonthly(line: MonthlyLine): boolean {
  return (
    line.type == null &&
    line.montant_en_euros == null &&
    line.date_debut == null &&
    line.date_fin == null &&
    line.niveau_preuve == null
  )
}

function ghostOneOff(line: OneOffLine): boolean {
  return (
    line.type == null &&
    line.montant_en_euros == null &&
    line.mois_imputation == null &&
    line.niveau_preuve == null
  )
}

function covers(start: string | null, end: string | null, on: string): boolean {
  if (start != null && start > on) return false
  if (end != null && end < on) return false
  return true
}

function consumptionUnits(common: CommonData, on: string): number | null {
  let total = 0
  let counted = 0
  let reference = false
  for (const person of common.foyer.adultes) {
    if (
      !isResident(person.mode_residence) ||
      (person.date_naissance != null && person.date_naissance > on)
    ) {
      continue
    }
    counted += 1
    if (!reference) {
      total += 1
      reference = true
      continue
    }
    const share = shareOf(person.date_naissance, on)
    if (share == null) return null
    total += share
  }
  for (const person of common.foyer.enfants) {
    if (
      !isResident(person.mode_residence) ||
      (person.date_naissance != null && person.date_naissance > on)
    ) {
      continue
    }
    counted += 1
    const share = shareOf(person.date_naissance, on)
    if (share == null) return null
    total += share
  }
  return counted === 0 ? 0 : Math.round(total * 10) / 10
}

function shareOf(birth: string | null, on: string): number | null {
  if (birth == null) return null
  return age(birth, on) >= 14 ? 0.5 : 0.3
}

function age(birth: string, on: string): number {
  let years = Number(on.slice(0, 4)) - Number(birth.slice(0, 4))
  const month = on.slice(5, 7)
  const day = on.slice(8, 10)
  if (month < birth.slice(5, 7) || (month === birth.slice(5, 7) && day < birth.slice(8, 10)))
    years -= 1
  return years
}

export function recalculateSchedule(common: CommonData, value: Schedule): Schedule {
  return {
    ...value,
    montant_a_apurer_en_euros: amountToSettle(common, value),
    echeances: value.echeances.map((row) => ({ ...row, ...installmentMetrics(common, row) }))
  }
}

export function scheduleGap(value: Schedule): number | null {
  if (value.montant_a_apurer_en_euros == null) return null
  let cents = centsOf(value.montant_a_apurer_en_euros)
  for (const row of value.echeances) {
    if (row.montant_en_euros == null) return null
    cents -= centsOf(row.montant_en_euros)
  }
  return cents / 100
}

export function refreshForms(forms: RepaymentForms): RepaymentForms {
  return {
    ...forms,
    echeancier: recalculateSchedule(forms.donnees_communes, forms.echeancier)
  }
}
