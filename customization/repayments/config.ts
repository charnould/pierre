/*
  Module « Recouvrement » de l'application desktop
  Valider la structure : bun test config/checks/repayment.test.ts
*/

export default {
  /*
    ########################################################################
    buckets — sections de la vue Recouvrement (une table par bucket)
    ########################################################################

    Chaque entrée DOIT être un objet :
      {
        id: string           // obligatoire, technique, stable
        label: string        // obligatoire, titre de la section
        description?: string // optionnel, phrase d’aide sous le titre
      }

    --- id -----------------------------------------------------------------
      - Immuable (snake_case recommandé, sans accents ni espaces)
      - On peut renommer `label` / `description` SANS changer `id`.
      - Changer un `id` existant casse les historiques et préférences.

    --- description --------------------------------------------------------
      - Courte phrase affichée sous le label dans l’en-tête de section.
      - Absente ou vide → rien n’est rendu sous le titre.

    --- ids réservés (OBLIGATOIRES ET NON MODIFIABLES) ---------------------
      - non_traites : point d’entrée par défaut du parcours-impayés des locataire en place.
      - clients_partis : assignation automatique pour les locataires partis

    --- ordre --------------------------------------------------------------
      - L'ordre de ce tableau = l'ordre d’affichage dans l'interface-utilisatuer.
  */
  buckets: [
    {
      id: 'non_traites',
      label: 'Non traités',
      description: 'Dossiers entrants pas encore analysés ni orientés.'
    },
    {
      id: 'amiable',
      label: 'Recouvrement amiable',
      description: 'Pré-relance, rejet de prélèvement ou première relance en cours.'
    },
    {
      id: 'plan_apurement_en_cours',
      label: 'Plan amiable / EV en cours',
      description: 'Plan d’apurement amiable ou engagement verbal en cours.'
    },
    {
      id: 'pre_contentieux',
      label: 'Précontentieux',
      description: 'R2 ou mise en demeure réalisée, avant commandement de payer.'
    },
    {
      id: 'commandement_de_payer',
      label: 'Commandement de payer',
      description: 'Commandement demandé ou signifié, avant transfert contentieux.'
    },
    {
      id: 'plan_suite_cdp_en_cours',
      label: 'Plan suite CDP',
      description: 'Plan conclu après commandement de payer.'
    },
    {
      id: 'contentieux',
      label: 'Contentieux',
      description: 'Dossier transféré au service contentieux ou procédure engagée.'
    },
    {
      id: 'post_jugement',
      label: 'Post-jugement',
      description: 'Exécution et suivi après décision judiciaire.'
    },
    {
      id: 'surendettement_instruction',
      label: 'Surendettement en instruction',
      description: 'Démarche Banque de France connue, en attente d’orientation.'
    },
    {
      id: 'plan_bdf_en_cours',
      label: 'Plan / mesures BDF en cours',
      description: 'Plan ou mesures imposées Banque de France en cours.'
    },
    {
      id: 'moratoire',
      label: 'Moratoire Banque de France',
      description: 'Dette gelée pendant la durée du moratoire.'
    },
    {
      id: 'prp',
      label: 'Rétablissement personnel',
      description: 'Procédure de rétablissement personnel en cours.'
    },
    {
      id: 'clos',
      label: 'Clos / soldé',
      description: 'Dette soldée, effacée ou dossier définitivement clôturé.'
    },
    {
      id: 'clients_partis',
      label: 'Clients partis',
      description: 'Locataires partis suivis sans commandement de payer.'
    }
  ],

  /*
    ########################################################################
    actions — actes disponibles dans le dossier
    ########################################################################

    Les libellés sont des verbes à l’infinitif. Ils sont stockés tels quels
    dans les activités : renommer un libellé ne réécrit pas l’historique.

    - dossier : suggestions du drawer et de Pierre pour un dossier individuel
    - bulk_operations : actes portés directement par les communications bulk

    Le drawer autorise aussi une action libre absente de cette configuration.

    L’ordre du tableau = ordre des listes et sélecteurs dans l'interface-utilisateur.
  */
  actions: {
    dossier: [
      'Analyser le dossier',
      'Joindre le locataire',
      'Constater un appel sans réponse',
      'Réaliser une visite',
      'Demander des pièces',
      'Analyser un rejet de prélèvement',
      'Modifier l’échéance de prélèvement',
      'Proposer un plan',
      'Préparer un projet de plan',
      'Relancer une échéance de plan',
      'Constater un incident de plan',
      'Modifier un plan',
      'Contacter la CAF',
      'Transmettre une saisine CAF',
      'Transmettre une mainlevée CAF',
      'Contacter un travailleur social',
      'Transmettre un dossier FSL',
      'Solliciter un partenaire',
      'Saisir la CCAPEX',
      'Demander un commandement de payer',
      'Enregistrer la signification du commandement de payer',
      'Transférer le dossier au contentieux',
      'Enregistrer une démarche Banque de France',
      'Dénoncer un plan Banque de France',
      'Contacter les héritiers ou le notaire',
      'Enregistrer un paiement',
      'Clôturer le dossier'
    ],
    bulk_operations: [
      'Envoyer un RCS de relance',
      'Envoyer un SMS de relance',
      'Envoyer un e-mail de relance',
      'Envoyer un courrier',
      'Envoyer une relance après rejet de prélèvement',
      'Envoyer l’e-mail de pré-relance R0',
      'Envoyer le courrier R1',
      'Envoyer la mise en demeure R2',
      'Envoyer une relance pour plan non respecté',
      'Envoyer une mise en demeure Banque de France'
    ]
  },

  /*
    ########################################################################
    tags — étiquettes du dossier (drawer Impayés)
    ########################################################################

    Liste fermée de libellés, stockés tels quels dans les activités :
    renommer une entrée ne réécrit pas l’historique.

    L’ordre du tableau = ordre du sélecteur et d’affichage.
  */
  tags: ['décès', '+65 ans', 'Redémarrage APL'],

  /*
    ########################################################################
    template_groups — ordre des rubriques du menu « Contacter un tiers »
    ########################################################################

    Chaînes = champ frontmatter `group` des markdown
    (`customization/repayments/templates/*.md`).

    Absent ou tableau vide → rubriques et modèles en ordre alpha (`fr`).
    Présent → cet ordre ; un `group` hors liste va à la fin (alpha) ;
    une entrée sans fichier est ignorée.

    Dans une rubrique, les modèles sont toujours triés par `label` (alpha `fr`).
  */
  template_groups: ['RCS/SMS au (ex-)client', 'Email au (ex-)client', 'Email à la CAF'],

  /*
    ########################################################################
    create_plan — effets à l’enregistrement / clôture d’un plan
    ########################################################################

    Switch « Signé » du formulaire :
      - décoché → le plan reste un brouillon modifiable
      - coché   → bucket = signed_bucket_id ; le plan devient immuable

    - signed_bucket_id : id d’une entrée de `buckets`
    - close.*          : bucket selon le motif de clôture du plan
  */
  create_plan: {
    signed_bucket_id: 'plan_apurement_en_cours',
    /*
      close — bucket selon le motif
      (statut activité = id motif).
    */
    close: {
      execution_complete: {
        bucket_id: 'clos'
      },
      non_respect: {
        bucket_id: 'pre_contentieux'
      },
      remplacement_par_nouveau_plan: {
        bucket_id: 'amiable'
      },
      effacement_de_dette: {
        bucket_id: 'clos'
      }
    }
  }
}
