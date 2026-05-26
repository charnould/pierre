// A propos de `logo.svg` (customization/desktop/) :
// Un seul <svg> racine avec viewBox, width et height cohérents.
// Pas d'attributs d'export (xmlns:v, etc.).
// L'app desktop redimensionne le logo à ~56 px en haut de l'écran de connexion.

export default {
  // Nom de l'agent dans l'application
  name: 'Gustave',
  // Headline sur l'écran de connexion
  headline: 'Agent IA HLM open source',
  // Modèle d’URL pour pouvoir accéder en un clic
  // à une réclamation dans les ERP (pré)-historiques
  ticket_url_pattern: 'https://pierre-aravis.charnould.workers.dev?id={id_reclamation}'
}
