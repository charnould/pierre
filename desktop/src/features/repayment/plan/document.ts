export const STAGES = [
  ['Recouvrement amiable', 'Recouvrement amiable'],
  ['Commandement de payer', 'Commandement de payer'],
  ['Assignation au tribunal', 'Assignation'],
  ['Audience au tribunal', 'Audience'],
  ['Décision en attente', 'Attente de décision'],
  ['Décision du juge rendue', 'Décision du juge'],
  ['Décision de justice signifiée', 'Signification'],
  ['Commandement de quitter les lieux', 'Commandement de quitter les lieux']
] as const

export const BANK_OF_FRANCE = [
  'Aucune procédure',
  'Dossier recevable en cours d’instruction',
  'Plan ou mesures imposés',
  'Plan de redressement personnel (PRP)',
  'Moratoire'
] as const

export const JOBS = [
  'Salarié en CDI',
  'Salarié en CDI (période d’essai)',
  'Salarié en CDD',
  'Salarié en CDD (période d’essai)',
  'Intérimaire',
  'Indépendant / Auto-entrepreneur',
  'Chef d’entreprise',
  'Fonctionnaire / Agent public',
  'Sans emploi',
  'Étudiant',
  'Retraité',
  'Sans activité professionnelle',
  'Autre'
] as const

export const MONTHLY_INCOME = [
  [
    'Ressources d’activité',
    [
      ['Salaire net', 'CDI, CDD, intérim, alternance'],
      ['Revenus d’activité indépendante', 'auto-entreprise, entreprise, activité libérale'],
      ['Allocations chômage', 'ARE, allocation de sécurisation professionnelle'],
      ['Indemnités journalières', 'maladie, accident du travail, maternité']
    ]
  ],
  [
    'Pensions',
    [
      ['Pensions de retraite', 'retraite de base, complémentaire'],
      ['Pensions d’invalidité', 'pension d’invalidité, rente d’incapacité'],
      ['Pensions alimentaires reçues', 'pension versée pour les enfants']
    ]
  ],
  [
    'Prestations',
    [
      [
        'Prestations familiales',
        'allocations familiales, complément familial, allocation de soutien familial'
      ],
      ['Aides au logement', 'APL, ALF, ALS'],
      ['Minima sociaux', 'RSA, allocation aux adultes handicapés'],
      ['Prime d’activité', 'prime d’activité']
    ]
  ],
  [
    'Autres ressources',
    [
      ['Revenus locatifs', 'loyers perçus'],
      ['Autres ressources', 'aide régulière d’un proche, autres revenus']
    ]
  ]
] as const

export const ONE_OFF_INCOME = [
  ['Prime exceptionnelle', 'prime employeur, prime de fin d’année'],
  ['Rappel de prestations', 'CAF, chômage, retraite'],
  ['Indemnités exceptionnelles', 'indemnisation, dommages et intérêts'],
  ['Héritage et donation', 'succession, don familial'],
  ['Vente d’un bien', 'véhicule, mobilier, autre bien'],
  ['Aide exceptionnelle', 'aide familiale, aide d’une association'],
  ['Déblocage d’épargne', 'livret, épargne salariale'],
  ['Remboursement exceptionnel', 'trop-perçu d’impôts, remboursement de frais'],
  ['Autres ressources ponctuelles', 'rentrée d’argent exceptionnelle non couverte']
] as const

export const MONTHLY_EXPENSES = [
  ['Crédits en cours', 'immobilier, consommation, automobile'],
  ['Assurance habitation', 'multirisque, assurance locative'],
  ['Santé', 'mutuelle, frais médicaux réguliers'],
  ['Énergie et fluide', 'électricité, gaz, eau'],
  ['Télécommunications', 'téléphone, internet, télévision'],
  ['Transport', 'transports en commun, carburant, assurance automobile'],
  ['Alimentation', 'courses alimentaires, produits courants'],
  ['Garde et scolarité', 'crèche, cantine, garde d’enfants'],
  ['Pensions alimentaires', 'pensions versées aux enfants ou à l’ex-conjoint'],
  ['Impôts', 'taxe foncière et autres'],
  ['Abonnements', 'plateformes, services, adhésions'],
  ['Autres charges', 'dépenses récurrentes non couvertes']
] as const

export const ONE_OFF_EXPENSES = [
  ['Dette à rembourser', 'dette familiale, crédit impayé, autre dette'],
  ['Santé', 'soins dentaires, lunettes, frais médicaux exceptionnels'],
  ['Véhicule', 'réparation, entretien, contrôle technique'],
  ['Logement', 'réparation, mobilier, équipement indispensable'],
  ['Énergie et fluide', 'régularisation de facture, impayé'],
  ['Impôts', 'rappel, régularisation fiscale'],
  ['Justice', 'frais d’avocat, frais de procédure'],
  ['Enfants', 'rentrée scolaire, équipement, dépense exceptionnelle'],
  ['Déménagement', 'transport, dépôt de garantie, frais d’installation'],
  ['Famille', 'frais exceptionnels liés à un proche'],
  ['Autres dépenses', 'dépense exceptionnelle non couverte']
] as const

export const UNASSIGNED_PERSON = 'Foyer (non assigné)'

export const MOTIVES = [
  'Perte d’emploi',
  'Crédit à la consommation',
  'Séparation',
  'Deuil',
  'Fin du titre de séjour',
  'Frais médicaux',
  'Frais de réparation du véhicule',
  'Modification de la composition familiale',
  'Maladie',
  'Dépendance administrative et budgétaire',
  'Violence conjugale',
  'SLS'
] as const

export const AIDS = [
  'FSL',
  'Action Logement',
  'Secours catholique',
  'Ligue contre le cancer'
] as const

export type SocialWorker = {
  prenom_et_nom: string | null
  organisme: string | null
  coordonnees: string | null
  date_dernier_contact_avec_le_bailleur: string | null
  date_dernier_contact_avec_le_locataire: string | null
}

export type Guarantor = {
  prenom: string | null
  nom: string | null
}

export type Adult = {
  prenom: string | null
  nom: string | null
  date_naissance: string | null
  type_emploi: string | null
  employeur: string | null
  numero_allocataire_caf: string | null
  titulaire_du_bail: boolean
  occupant_du_logement: boolean
}

export type Child = {
  prenom: string | null
  nom: string | null
  date_naissance: string | null
  a_charge: boolean
}

export type MonthlyIncome = {
  type: string | null
  personne: string
  montant_euros: number | null
}

export type OneOffIncome = {
  type: string | null
  personne: string
  date_imputation: string | null
  montant_euros: number | null
}

export type MonthlyExpense = {
  type: string | null
  personne: string
  date_fin: string | null
  montant_euros: number | null
}

export type OneOffExpense = {
  type: string | null
  personne: string
  date_imputation: string | null
  montant_euros: number | null
}

export function householdPeople(foyer: CaseFile['foyer']): string[] {
  const names: string[] = []
  for (const member of [...foyer.adultes, ...foyer.enfants]) {
    const label = [member.prenom, member.nom]
      .map((part) => part?.trim() ?? '')
      .filter((part) => part !== '')
      .join(' ')
    if (label !== '' && !names.includes(label)) names.push(label)
  }
  return [UNASSIGNED_PERSON, ...names]
}

export function personChoices(people: readonly string[], current: string): string[] {
  return people.includes(current) ? [...people] : [...people, current]
}

export type Installment = {
  date_echeance: string | null
  mensualite_euros: number | null
}

export type CaseFile = {
  identification: {
    identifiant_client: string | null
    identifiant_locataire: string | null
    identifiant_logement: string | null
    adresse: {
      voie: string | null
      code_postal: string | null
      commune: string | null
    }
  }
  dette: {
    montant_restant_du_euros: number | null
    date_premier_loyer_impaye: string | null
    motifs_impaye: string[]
    ancienne_dette_locative_euros: number | null
  }
  procedure: {
    stade: string | null
    date_du_stade: string | null
    situation_banque_de_france: string | null
    date_fin_moratoire: string | null
  }
  accompagnement: {
    visite_a_domicile: boolean
    travailleur_social: SocialWorker | null
    date_saisine_ccapex_prevention_expulsions: string | null
    date_saisine_ctesi_situations_individuelles: string | null
    aides_mobilisables: string[]
  }
  bail: {
    avenant_signe: boolean
    date_depot_preavis_conge: string | null
    contentieux_anterieur_sur_ce_contrat: boolean
    garant: Guarantor | null
  }
  foyer: {
    adultes: Adult[]
    enfants: Child[]
  }
  budget: {
    ressources_mensuelles: MonthlyIncome[]
    ressources_ponctuelles: OneOffIncome[]
    loyer_charges_moins_aides_au_logement_euros: number | null
    charges_mensuelles: MonthlyExpense[]
    charges_ponctuelles: OneOffExpense[]
  }
  echeancier: {
    propose: boolean
    echeances: Installment[]
  }
}

export function replaceFirst<T>(rows: readonly T[], patch: Partial<T>): T[] {
  return rows.map((row, index) => (index === 0 ? { ...row, ...patch } : row))
}

function assignedPerson(value: string | null | undefined): string {
  if (value == null) return UNASSIGNED_PERSON
  const text = value.trim()
  return text === '' ? UNASSIGNED_PERSON : text
}

function blankToNull(value: string | null): string | null {
  if (value == null) return null
  const text = value.trim()
  return text === '' ? null : text
}

export function normalize(record: CaseFile): CaseFile {
  const social = record.accompagnement.travailleur_social
  const guarantor = record.bail.garant
  return {
    identification: {
      identifiant_client: blankToNull(record.identification.identifiant_client),
      identifiant_locataire: blankToNull(record.identification.identifiant_locataire),
      identifiant_logement: blankToNull(record.identification.identifiant_logement),
      adresse: {
        voie: blankToNull(record.identification.adresse.voie),
        code_postal: blankToNull(record.identification.adresse.code_postal),
        commune: blankToNull(record.identification.adresse.commune)
      }
    },
    dette: {
      montant_restant_du_euros: record.dette.montant_restant_du_euros,
      date_premier_loyer_impaye: blankToNull(record.dette.date_premier_loyer_impaye),
      motifs_impaye: [...record.dette.motifs_impaye],
      ancienne_dette_locative_euros: record.dette.ancienne_dette_locative_euros
    },
    procedure: {
      stade: record.procedure.stade,
      date_du_stade: blankToNull(record.procedure.date_du_stade),
      situation_banque_de_france: record.procedure.situation_banque_de_france,
      date_fin_moratoire:
        record.procedure.situation_banque_de_france === 'Moratoire'
          ? blankToNull(record.procedure.date_fin_moratoire)
          : null
    },
    accompagnement: {
      visite_a_domicile: record.accompagnement.visite_a_domicile,
      travailleur_social: social
        ? {
            prenom_et_nom: blankToNull(social.prenom_et_nom),
            organisme: blankToNull(social.organisme),
            coordonnees: blankToNull(social.coordonnees),
            date_dernier_contact_avec_le_bailleur: blankToNull(
              social.date_dernier_contact_avec_le_bailleur
            ),
            date_dernier_contact_avec_le_locataire: blankToNull(
              social.date_dernier_contact_avec_le_locataire
            )
          }
        : null,
      date_saisine_ccapex_prevention_expulsions: blankToNull(
        record.accompagnement.date_saisine_ccapex_prevention_expulsions
      ),
      date_saisine_ctesi_situations_individuelles: blankToNull(
        record.accompagnement.date_saisine_ctesi_situations_individuelles
      ),
      aides_mobilisables: record.accompagnement.aides_mobilisables
        .map((aid) => aid.trim())
        .filter((aid) => aid !== '')
    },
    bail: {
      avenant_signe: record.bail.avenant_signe,
      date_depot_preavis_conge: blankToNull(record.bail.date_depot_preavis_conge),
      contentieux_anterieur_sur_ce_contrat: record.bail.contentieux_anterieur_sur_ce_contrat,
      garant: guarantor
        ? { prenom: blankToNull(guarantor.prenom), nom: blankToNull(guarantor.nom) }
        : null
    },
    foyer: {
      adultes: record.foyer.adultes.map((adult) => ({
        prenom: blankToNull(adult.prenom),
        nom: blankToNull(adult.nom),
        date_naissance: blankToNull(adult.date_naissance),
        type_emploi: adult.type_emploi,
        employeur: blankToNull(adult.employeur),
        numero_allocataire_caf: blankToNull(adult.numero_allocataire_caf),
        titulaire_du_bail: adult.titulaire_du_bail,
        occupant_du_logement: adult.occupant_du_logement
      })),
      enfants: record.foyer.enfants.map((child) => ({
        prenom: blankToNull(child.prenom),
        nom: blankToNull(child.nom),
        date_naissance: blankToNull(child.date_naissance),
        a_charge: child.a_charge
      }))
    },
    budget: {
      ressources_mensuelles: record.budget.ressources_mensuelles.map((row) => ({
        ...row,
        personne: assignedPerson(row.personne)
      })),
      ressources_ponctuelles: record.budget.ressources_ponctuelles.map((row) => ({
        ...row,
        personne: assignedPerson(row.personne),
        date_imputation: blankToNull(row.date_imputation)
      })),
      loyer_charges_moins_aides_au_logement_euros:
        record.budget.loyer_charges_moins_aides_au_logement_euros,
      charges_mensuelles: record.budget.charges_mensuelles.map((row) => ({
        ...row,
        personne: assignedPerson(row.personne),
        date_fin: blankToNull(row.date_fin)
      })),
      charges_ponctuelles: record.budget.charges_ponctuelles.map((row) => ({
        ...row,
        personne: assignedPerson(row.personne),
        date_imputation: blankToNull(row.date_imputation)
      }))
    },
    echeancier: {
      propose: record.echeancier.propose,
      echeances: record.echeancier.echeances.map((installment) => ({
        date_echeance: blankToNull(installment.date_echeance),
        mensualite_euros: installment.mensualite_euros
      }))
    }
  }
}

export function emptyCase(): CaseFile {
  return {
    identification: {
      identifiant_client: null,
      identifiant_locataire: null,
      identifiant_logement: null,
      adresse: { voie: null, code_postal: null, commune: null }
    },
    dette: {
      montant_restant_du_euros: null,
      date_premier_loyer_impaye: null,
      motifs_impaye: [],
      ancienne_dette_locative_euros: null
    },
    procedure: {
      stade: null,
      date_du_stade: null,
      situation_banque_de_france: null,
      date_fin_moratoire: null
    },
    accompagnement: {
      visite_a_domicile: false,
      travailleur_social: null,
      date_saisine_ccapex_prevention_expulsions: null,
      date_saisine_ctesi_situations_individuelles: null,
      aides_mobilisables: []
    },
    bail: {
      avenant_signe: false,
      date_depot_preavis_conge: null,
      contentieux_anterieur_sur_ce_contrat: false,
      garant: null
    },
    foyer: {
      adultes: [
        {
          prenom: null,
          nom: null,
          date_naissance: null,
          type_emploi: null,
          employeur: null,
          numero_allocataire_caf: null,
          titulaire_du_bail: false,
          occupant_du_logement: false
        }
      ],
      enfants: [{ prenom: null, nom: null, date_naissance: null, a_charge: false }]
    },
    budget: {
      ressources_mensuelles: [{ type: null, personne: UNASSIGNED_PERSON, montant_euros: null }],
      ressources_ponctuelles: [
        {
          type: null,
          personne: UNASSIGNED_PERSON,
          date_imputation: null,
          montant_euros: null
        }
      ],
      loyer_charges_moins_aides_au_logement_euros: null,
      charges_mensuelles: [
        { type: null, personne: UNASSIGNED_PERSON, date_fin: null, montant_euros: null }
      ],
      charges_ponctuelles: [
        { type: null, personne: UNASSIGNED_PERSON, date_imputation: null, montant_euros: null }
      ]
    },
    echeancier: { propose: true, echeances: [] }
  }
}
