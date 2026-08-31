// ---------------------------------------------------------------------------
// ticket — Liens ERP / réclamations (desktop)
// ---------------------------------------------------------------------------
//
// Ce fichier pilote le modèle d’URL pour ouvrir une réclamation dans les ERP
// (pré)-historiques. Il est lu par :
//   - desktop/src/features/workflow/components/WorkflowPanelChrome.tsx
//   - desktop/src/shared/lib/ticket-url.ts (via les consommateurs du pattern)
//
// Valider la structure avant démarrage :
//   bun run config:checks
//
// Placeholder obligatoire dans ticket_url_pattern : {{id_reclamation}}

export default {
  // Modèle d’URL pour pouvoir accéder en un clic
  // à une réclamation dans les ERP (pré)-historiques
  ticket_url_pattern: 'https://pierre-aravis.charnould.workers.dev?id={{id_reclamation}}'
}
