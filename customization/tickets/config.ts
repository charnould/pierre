export default {
  /*
    Module « Réclamations » de l'application desktop.
    Valider la structure : bun test config/checks/ticket.test.ts

    buckets — paniers de la vue Réclamations

    Chaque id est technique, stable et immuable. Il peut être référencé dans
    l'historique des activités et les préférences utilisateur. Le label peut
    évoluer sans changer l'id.

    `non_traitees` est le panier système obligatoire des nouvelles
    réclamations. L'ordre du tableau est l'ordre d'affichage.
  */
  buckets: [
    {
      id: 'non_traitees',
      label: 'Non traitées'
    }
  ],

  /*
    tags — étiquettes métier proposées dans le drawer

    Liste fermée, stockée telle quelle dans les activités. L'ordre du tableau
    est l'ordre du sélecteur et de l'affichage.
  */
  tags: [
    'Urgent',
    'Sécurité des personnes',
    'Personne vulnérable',
    'Insalubrité',
    'Accessibilité / PMR',
    'Réclamation collective',
    'Récidive',
    'Médiation',
    'Contentieux potentiel',
    'Dédommagement demandé',
    'Attente prestataire',
    'Attente locataire'
  ],

  /*
    Application externe du module Réclamations.

    `url_pattern` peut référencer toute colonne d’une réclamation avec
    `{{nom_de_colonne}}`. Un modèle sans variable est également valide.
  */
  external_application: {
    name: 'Aravis',
    url_pattern: 'https://pierre-aravis.charnould.workers.dev?id={{id_reclamation}}',
    message_selector: '#pierre-bridge-demo-answer'
  }
}
