//
//  Paramétrages globaux de l'application Desktop
//

export default {
  // Nom de l’agent
  // Repris comme nom de l’agent une fois connecté (sidebar, disclaimer, etc.)
  // Format : string courte (ex. 'Pierre', 'Gustave').
  name: 'Pierre',

  //  Fuseau IANA des automatisations
  //  Heure murale utilisée pour calculer les prochaines exécutions planifiées
  //  Format : identifiant/fuseau IANA (ex. 'Europe/Paris', 'America/Martinique').
  //  Si absent ou vide → défaut code 'Europe/Paris'.
  timezone: 'Europe/Paris'
}
