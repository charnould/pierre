import type { Automation, ReportRun, TicketReplyRun } from '../lib/automation-types'

export type {
  Automation,
  AutomationStatus,
  ReportAutomation,
  ReportRun,
  TicketReplyAutomation,
  TicketReplyRun
} from '../lib/automation-types'

export type AutomationRun = ReportRun

export function formatFrequency(automation: Automation): string {
  const time = automation.frequencyTime
  switch (automation.frequency) {
    case 'daily':
      return `Chaque jour à ${time}`
    case 'weekly':
      return `Chaque ${automation.frequencyDay ?? 'lundi'} à ${time}`
    case 'monthly':
      return automation.frequencyDay
        ? `Le ${automation.frequencyDay} de chaque mois à ${time}`
        : `Chaque mois à ${time}`
  }
}

const DAY_MS = 1000 * 60 * 60 * 24

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.round((date.getTime() - now.getTime()) / DAY_MS)
  if (diffDays === 0) return "aujourd'hui"
  if (diffDays === -1) return 'hier'
  if (diffDays === 1) return 'demain'
  if (diffDays < 0 && diffDays > -7) return `il y a ${-diffDays} jours`
  if (diffDays > 0 && diffDays < 7) return `dans ${diffDays} jours`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export function formatAbsoluteDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function trimRunsToLimit<T extends { date: string }>(runs: T[], max: number): T[] {
  return [...runs]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, max)
}

export interface OrgUser {
  login: string
  firstName: string
  lastName: string
}

export const ORG_EMAIL_DOMAIN = 'granddijonhabitat.fr'

export function orgUserEmail(login: string): string {
  return `${login}@${ORG_EMAIL_DOMAIN}`
}

export const MOCK_ORG_USERS: OrgUser[] = [
  { firstName: 'Antoine', lastName: 'Bernard', login: 'abernard' },
  { firstName: 'Alice', lastName: 'Martin', login: 'amartin' },
  { firstName: 'Bruno', lastName: 'Côte', login: 'bcote' },
  { firstName: 'Bob', lastName: 'Leroy', login: 'bleroy' },
  { firstName: 'Camille', lastName: 'Dubois', login: 'cdubois' },
  { firstName: 'Charlie', lastName: 'Petit', login: 'cpetit' },
  { firstName: 'Chloé', lastName: 'Roux', login: 'croux' },
  { firstName: 'Danielle', lastName: 'Fabre', login: 'dfabre' },
  { firstName: 'Élodie', lastName: 'Girard', login: 'egirard' },
  { firstName: 'Fabien', lastName: 'Henry', login: 'fhenry' },
  { firstName: 'Grégoire', lastName: 'Ensel', login: 'gensel' },
  { firstName: 'Gabrielle', lastName: 'Imbert', login: 'gimbert' },
  { firstName: 'Hélène', lastName: 'Joly', login: 'hjoly' },
  { firstName: 'Hugo', lastName: 'Lemoine', login: 'hlemoine' },
  { firstName: 'Isabelle', lastName: 'Keller', login: 'ikeller' },
  { firstName: 'Julien', lastName: 'Marchand', login: 'jmarchand' },
  { firstName: 'Karim', lastName: 'Ndiaye', login: 'kndiaye' },
  { firstName: 'Laurence', lastName: 'Olivier', login: 'lolivier' },
  { firstName: 'Marie', lastName: 'Lefèvre', login: 'mlefevre' },
  { firstName: 'Marc', lastName: 'Perrin', login: 'mperrin' },
  { firstName: 'Nadia', lastName: 'Benali', login: 'nbenali' },
  { firstName: 'Nathalie', lastName: 'Robert', login: 'nrobert' },
  { firstName: 'Olivier', lastName: 'Simon', login: 'osimon' },
  { firstName: 'Paul', lastName: 'Durand', login: 'pdurand' },
  { firstName: 'Patricia', lastName: 'Thomas', login: 'pthomas' },
  { firstName: 'Quentin', lastName: 'Vasseur', login: 'qvasseur' },
  { firstName: 'Rachel', lastName: 'Weber', login: 'rweber' },
  { firstName: 'Sofia', lastName: 'Da Costa', login: 'sdacosta' },
  { firstName: 'Stéphane', lastName: 'Xavier', login: 'sxavier' },
  { firstName: 'Théo', lastName: 'Garnier', login: 'tgarnier' },
  { firstName: 'Thomas', lastName: 'Yilmaz', login: 'tyilmaz' },
  { firstName: 'Ursule', lastName: 'Zacharie', login: 'uzacharie' },
  { firstName: 'Virginie', lastName: 'Arnaud', login: 'varnaud' },
  { firstName: 'William', lastName: 'Blanc', login: 'wblanc' },
  { firstName: 'Xavier', lastName: 'Chevrier', login: 'xchevrier' }
]

const HEATMAP_MOIS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Août',
  'Sep',
  'Oct',
  'Nov',
  'Déc'
] as const

const HEATMAP_DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Grille calendrier type Seattle temperature heatmap (Observable Plot). */
function buildSeattleHeatmapPlotBlock(): string {
  const data: Array<{ jour: number; mois: string; activite: number }> = []
  for (let m = 0; m < 12; m++) {
    for (let j = 1; j <= HEATMAP_DAYS_IN_MONTH[m]; j++) {
      const seasonal = 28 + 22 * Math.sin((m / 11) * Math.PI)
      const ripple = 6 * Math.sin(j * 0.55 + m * 0.65)
      const grain = ((m * 31 + j) % 9) * 1.4
      const activite = Math.round(Math.max(8, Math.min(92, seasonal + ripple + grain)))
      data.push({ jour: j, mois: HEATMAP_MOIS[m], activite })
    }
  }
  return JSON.stringify({
    type: 'heatmap',
    data,
    x: 'jour',
    y: 'mois',
    fill: 'activite',
    caption: 'Trame calendrier à 17 h 30 — heatmap temporelle (12 mois × jours)'
  })
}

const ASTREINTE_HEATMAP_PLOT = buildSeattleHeatmapPlotBlock()

export const MOCK_RUNS: ReportRun[] = [
  {
    id: 'run-astreinte-1',
    automationId: 'auto-astreinte',
    date: '2026-06-13T17:00:00',
    report: `## Points chauds à 17h30

**Dix réclamations** sont arrivées en deux heures sur la résidence **Rosa Parks**, toutes signalant une **panne générale d'électricité**. Les locataires évoquent un black-out sur l'ensemble du bâtiment ; rien côté Enedis ni sur les résidences voisines — la panne semble **confinée à Rosa Parks**, pas un incident réseau de quartier.

**Vingt appels** concernent une **panne d'ascenseur** à la résidence **Oscar Wilde** (entrée B). Volume inhabituel pour ce créneau ; à traiter en priorité si les retours se confirment sur le même ascenseur.

Pour le reste du secteur, **rien de notable** à signaler à 17 h 30 : pas de cluster résidence, pas de sujet récurrent hors ces deux signaux.

\`\`\`plot
${ASTREINTE_HEATMAP_PLOT}
\`\`\`

## Interventions en cours

| Résidence | Adresse | Nature travaux | Fin prévue | Impact locataires |
|---|---|---|---|---|
| Les Tilleuls | 12 rue des Acacias, Chenôve | Remplacement colonne montante eau froide — étages 3 à 6 | 16/06 | Coupure eau 8h-12h les 14 et 15/06 |
| Parc Bel Air | 4 allée du Stade, Longvic | Réfection réseau chauffage collectif — sous-station | 20/06 | Baisse température possible en soirée |
| Résidence du Parc | 8 rue Molière, Chenôve | Étanchéité toiture terrasse — lot 2 | 25/06 | Pas d'impact intérieur direct |

## Pannes signalées — corrélation chantier

| Ticket | Logement | Sujet | Lié à un chantier ? | Action recommandée |
|---|---|---|---|---|
| #88412 | Chenôve — apt 304 | Pas d'eau froide | **Oui** — Les Tilleuls, colonne montante | Informer le locataire du créneau travaux ; pas de déplacement astreinte |
| #88407 | Longvic — apt 112 | Radiateurs tièdes | **Probable** — Parc Bel Air, sous-station | Vérifier avec l'entreprise CVC avant envoi technicien |
| #88398 | Chenôve — apt 207 | Fuite sous évier | Non | Intervention astreinte habituelle |
| #88391 | Longvic — apt 405 | Porte palier bloquée | Non | Sécurité — priorité haute |

\`\`\`plot
{
  "type": "barX",
  "data": [
    { "action": "Croiser chantier — pas de déplacement", "tickets": 2 },
    { "action": "Intervention astreinte", "tickets": 1 },
    { "action": "Priorité sécurité", "tickets": 1 }
  ],
  "x": "tickets",
  "y": "action",
  "caption": "Répartition des 4 tickets ouverts selon l'action recommandée (tableau ci-dessus)"
}
\`\`\`

\`\`\`plot
{
  "type": "sankey",
  "links": [
    { "source": "4 tickets ouverts", "target": "Lié à un chantier", "value": 2 },
    { "source": "4 tickets ouverts", "target": "Hors chantier", "value": 2 },
    { "source": "Lié à un chantier", "target": "Pas de déplacement astreinte", "value": 1 },
    { "source": "Lié à un chantier", "target": "Vérifier CVC avant envoi", "value": 1 },
    { "source": "Hors chantier", "target": "Intervention astreinte", "value": 1 },
    { "source": "Hors chantier", "target": "Priorité sécurité", "value": 1 }
  ],
  "caption": "Flux des tickets — corrélation chantier puis action recommandée (tableau ci-dessus)"
}
\`\`\`

---

## Contexte complémentaire

Éléments utiles pour arbitrer les appels et éviter les allers-retours inutiles :

- **Astreinte précédente (7-8 juin) :** 2 déplacements évités grâce au croisement chantiers / tickets — conserver cette habitude.
- **Contact entreprise eau (Les Tilleuls) :** M. Dupont — \`06 XX XX XX XX\` — joignable jusqu'à 20h.
- **Consignes GL :** ne pas promettre de délai ferme sur les réparations **hors sécurité** ; orienter vers le créneau travaux si applicable.
- **Météo :** week-end sec ; ~~risque gel~~ — levée vendredi 13/06.

Numéros et liens utiles :

1. [Annuaire astreinte Mouvement HLM](https://example.com/astreinte) — contacts secteur + entreprises.
2. [Portail tickets](https://example.com/tickets) — mise à jour statut obligatoire après chaque appel.
3. Relais lundi matin : **gensel** + **hjoly** (copie systématique).

#### Format contact entreprise (référence)

\`\`\`text
Résidence        | Contact    | Joignable
Les Tilleuls     | M. Dupont  | jusqu'à 20h
Parc Bel Air     | CVC Pro    | astreinte WE
\`\`\`

## Actions prioritaires

1. Traiter **#88391** (sécurité) en priorité absolue — voir callout urgent ci-dessus.
2. Pour **#88412** et **#88407** : appeler le locataire avec l'explication chantier *avant* tout déplacement.
3. Relayer au relais astreinte lundi matin les tickets encore ouverts (**#88398**).
4. Archiver ce brief dans l'espace équipe après la reprise (procédure ~~obsolète~~ — voir note interne du 01/06).

---

*Fin du brief — bon week-end d'astreinte.*
`
  },
  {
    id: 'run-astreinte-2',
    automationId: 'auto-astreinte',
    date: '2026-06-06T17:00:00',
    report: `# Brief astreinte — week-end 7-8 juin 2026

## Points chauds

Activité modérée. Un seul secteur sous tension : **Quetigny centre**, avec une réclamation collective sur les odeurs de canalisation.

## Travaux en cours sur le secteur

| Résidence | Adresse | Nature travaux | Fin prévue | Impact locataires |
|---|---|---|---|---|
| Les Erables | 22 av. de la République, Quetigny | Curage réseau EP — cages d'escalier B et C | 09/06 | Odeurs possibles, accès paliers nécessaires |
| Le Clos des Vignes | 5 rue des Lilas, Quetigny | Mise aux normes VMC — 18 logements | 12/06 | Coupure électricité local technique 07/06 14h-16h |

## Pannes signalées — corrélation chantier

| Ticket | Logement | Sujet | Lié à un chantier ? | Action recommandée |
|---|---|---|---|---|
| #88104 | Quetigny — apt B204 | Odeurs égout | **Oui** — curage Les Erables | Rassurer + informer fin travaux 09/06 |
| #88098 | Quetigny — apt A108 | VMC bruyante | **Oui** — Clos des Vignes | Pas d'astreinte si travaux en cours sur le lot |
| #88087 | Talant — apt 15 | Fuite chauffe-eau | Non | Déplacement astreinte |

## Bilan week-end

- 2 déplacements évités (tickets liés chantier).
- 1 intervention réelle (Talant).
`
  },
  {
    id: 'run-astreinte-3',
    automationId: 'auto-astreinte',
    date: '2026-05-30T17:00:00',
    report: `# Brief astreinte — week-end 31 mai — 1er juin 2026

## Points chauds

Semaine calme. Vigilance sur **Fontaine-lès-Dijon** : fin de travaux façade avec échafaudages encore en place.

## Travaux en cours sur le secteur

| Résidence | Adresse | Nature travaux | Fin prévue | Impact locataires |
|---|---|---|---|---|
| Les Hautes Bruyères | 3 chemin des Bruyères, Fontaine | Ravalement façade — phase 3 | 05/06 | Accès balcons limités |
| Résidence Saint-Bernard | 14 rue Pasteur, Dijon | Remplacement compteurs eau | 02/06 | Coupures individuelles 30 min par logement |

## Pannes signalées — corrélation chantier

| Ticket | Logement | Sujet | Lié à un chantier ? | Action recommandée |
|---|---|---|---|---|
| #87955 | Fontaine — apt 402 | Impossible ouvrir baie vitrée | **Oui** — échafaudage devant le logement | Pas d'astreinte — contacter entreprise façade |
| #87941 | Dijon — apt 12 | Compteur eau inaccessible | **Oui** — Saint-Bernard | Reprogrammer RDV compteur |

## Actions

Aucune urgence sécurité. Week-end de transition probable.
`
  },
  {
    id: 'run-astreinte-4',
    automationId: 'auto-astreinte',
    date: '2026-05-23T17:00:00',
    report: `# Brief astreinte — week-end 24-25 mai 2026

## Points chauds

Pic d'activité sur **Chenôve nord** : 4 tickets ouverts en 24 h, dont 2 potentiellement liés au même chantier réseau.

## Travaux en cours sur le secteur

| Résidence | Adresse | Nature travaux | Fin prévue | Impact locataires |
|---|---|---|---|---|
| Les Tilleuls | 12 rue des Acacias, Chenôve | Remplacement colonne montante — préparation | 30/05 | Accès conduites, bruit matin |

## Bilan

Week-end avec 3 appels ; 1 déplacement évité grâce au croisement chantier.
`
  },
  {
    id: 'run-locataire-recurrent-1',
    automationId: 'auto-locataire-recurrent',
    date: '2026-06-09T07:30:00',
    report: `# Vigie locataire récurrent — semaine 24

## Principe

Un même logement qui génère des réclamations répétées sur le **même sujet** malgré des interventions clôturées signale soit un problème non résolu, soit un sujet plus profond (usage, vétusté non traitée).

## Dossiers détectés cette semaine

| Logement | Sujet récurrent | Tickets (12 mois) | Interventions clôturées | Dernière clôture | Signal |
|---|---|---|---|---|---|
| Chenôve — apt 304, Les Tilleuls | Infiltration salle de bain | 5 | 3 | 22/05/2026 | **Critique** — 2 tickets post-intervention en 18 jours |
| Longvic — apt 08, Parc Bel Air | VMC insuffisante / condensation | 4 | 2 | 10/04/2026 | **Élevé** — même diagnostic, pas de travaux lourds engagés |
| Quetigny — apt C112, Les Erables | Porte d'entrée difficile à fermer | 3 | 3 | 15/03/2026 | **Modéré** — réglages répétés, vétusté huisserie probable |
| Talant — apt 22, Le Plateau | Bruits réseau chauffage la nuit | 3 | 2 | 08/02/2026 | **Élevé** — locataire signale « rien n'a changé » |

## Analyse — Chenôve apt 304 (priorité 1)

- **Historique :** 5 tickets « infiltration SDB » depuis sept. 2025 ; 3 interventions (joints, recherche fuite, rebouchage) toutes clôturées « résolu ».
- **Hypothèses :** fuite structurelle non identifiée (colonne voisine ou façade) ; risque de pathologie masquée.
- **Recommandation :** passer en **diagnostic technique** (pas nouvelle intervention ponctuelle) ; convoquer locataire + entreprise référencée ; envisager travaux lourds / expertise humidité.

## Actions proposées

1. **Chenôve 304** — escalade gestionnaire + plan diagnostic sous 5 jours ouvrés.
2. **Longvic 08** — audit VMC complet (débit, extraction, isolation) avant nouvelle intervention.
3. **Quetigny C112** — chiffrage remplacement huisserie vs. réglages répétés.
4. **Talant 22** — contrôle réseau + purge ; si récidive, visite ingénierie chauffage.
`
  },
  {
    id: 'run-travaux-inefficaces-1',
    automationId: 'auto-travaux-inefficaces',
    date: '2026-06-12T09:00:00',
    report: `# Vigie travaux inefficaces — contrôle qualité

## Principe

Ticket travaux clôturé récemment, puis **nouvelle réclamation sur le même logement et la même nature** dans les semaines suivantes → signal de contrôle qualité sur l'intervention.

## Cas détectés (fenêtre : clôture < 8 semaines)

| Logement | Nature | Ticket travaux | Clôture | Nouvelle réclamation | Délai | Entreprise |
|---|---|---|---|---|---|---|
| Dijon — apt 7, Saint-Bernard | Désembouage + équilibrage radiateurs | #TW-7721 | 15/05/2026 | #88602 « radiateurs froids salon » | 28 jours | ThermoPro 21 |
| Chenôve — apt 112, Les Tilleuls | Remplacement robinet thermostatique | #TW-7688 | 28/04/2026 | #88514 « fuite au radiateur chambre » | 45 jours | CVC Express |
| Longvic — apt 305, Parc Bel Air | Réparation fuite WC | #TW-7610 | 10/04/2026 | #88489 « WC qui fuit à nouveau » | 63 jours | Sani-Rénov |

## Analyse — Dijon apt 7 (priorité)

- Intervention clôturée « conforme » le 15/05 ; locataire rappelle le 12/06 : salon reste froid malgré désembouage.
- **Piste :** équilibrage incomplet ou vanne non réouverte ; possible défaut non visible lors de la clôture.
- **Action QC :** retour entreprise ThermoPro 21 sous garantie ; vérification courbe de température ; ne pas reclôturer sans mesure d'efficacité.

## Actions proposées

1. **Saint-Bernard apt 7** — retour chantier + contrôle qualité interne (photo + relevé températures).
2. **Les Tilleuls apt 112** — audit pose robinet ; facturation retenue si malfaçon avérée.
3. **Parc Bel Air apt 305** — deuxième intervention Sani-Rénov ; si récidive, changement prestataire.
4. Alimenter le **tableau de suivi qualité entreprises** avec ces 3 cas.
`
  },
  {
    id: 'run-vigie-saisonniere-1',
    automationId: 'auto-vigie-saisonniere',
    date: '2025-10-15T07:00:00',
    report: `# Vigie saisonnière chauffage — anticipation hiver 2025-2026

## Principe

Avant l'hiver, repérer les bâtiments dont les **chaudières ou réseaux collectifs** ont eu des incidents à la **même période l'année précédente**, pour anticiper une visite de contrôle.

## Bâtiments à risque identifiés

Comparaison incidents oct.–déc. 2024 vs. parc global — seuil : ≥ 2 incidents même nature sur la même résidence.

| Résidence | Type chauffage | Incidents hiver 2024-25 | Nature récurrente | Dernière visite contrôle | Priorité visite |
|---|---|---|---|---|---|
| Les Tilleuls, Chenôve | Collectif gaz — 1 chaudière | 3 pannes (nov., déc.) | Allumage + pression | 12/03/2025 | **Haute** — visite avant 01/11 |
| Parc Bel Air, Longvic | Collectif — sous-station | 2 pannes (oct., janv.) | Défaut circulateur | 08/06/2025 | **Haute** |
| Résidence du Parc, Chenôve | Individuel électrique + appoint | 2 tickets (déc.) | Radiateurs salon | 22/01/2025 | Moyenne |
| Les Erables, Quetigny | Collectif fioul → gaz (2023) | 1 panne majeure (nov.) | Vanne régulation | 15/09/2025 | Moyenne — post-conversion |

## Plan d'action pré-hiver

1. **Les Tilleuls** — contrôle annuel chaudière + test allumage à froid ; prévoir pièces détachées brûleur.
2. **Parc Bel Air** — inspection sous-station et circulateurs ; contrat maintenance renforcé nov.–mars.
3. **Les Erables** — vérification post-conversion gaz (1 an après bascule).
4. Programmer les **26 visites préventives** identifiées avant le 15/11/2025.

## Rappel

Cette vigie reprend chaque **15 octobre**. Prochaine exécution : 15/10/2026.
`
  },
  {
    id: 'run-tension-locataire-1',
    automationId: 'auto-tension-locataire',
    date: '2026-06-11T08:00:00',
    report: `# Vigie tension locataire — dossiers sensibles

## Principe

Logement avec **impayés en cours** ET **réclamations actives** → ces dossiers nécessitent souvent une approche différente (médiation, contexte social) et un traitement plus humain qu'une simple file de tickets.

## Dossiers croisés cette semaine

| Logement | Locataire | Impayés | Montant dû | Réclamations actives | Sujets réclamation | Niveau tension |
|---|---|---|---|---|---|---|
| Chenôve — apt 207 | Mme L. | 3 mois | 1 840 € | 2 | Chauffage + humidité | **Élevé** |
| Quetigny — apt A204 | M. et Mme D. | 2 mois | 980 € | 1 | Fuite cuisine | Modéré |
| Longvic — apt 405 | M. K. | 4 mois | 2 620 € | 3 | Ascenseur + porte + bruit | **Critique** |
| Dijon — apt 12, Saint-Bernard | Mme R. | 1 mois | 420 € | 1 | Compteur eau | Modéré |

## Analyse — Longvic apt 405 (priorité critique)

- Cumul **4 mois d'impayés** et **3 réclamations ouvertes** ; locataire a mentionné « on ne répond jamais » au gestionnaire.
- Risque d'escalade (refus d'accès, contentieux, signalement préfecture).
- **Recommandation :** contact téléphonique prioritaire (pas mail) ; proposition RDV conjoint gestionnaire + assistant social ; traiter ascenseur en urgence relative pour désamorcer.

## Approche recommandée

1. **Ne pas traiter impayés et réclamations en silos** — un interlocuteur unique par dossier.
2. **Longvic 405** et **Chenôve 207** : médiation sous 7 jours.
3. **Quetigny A204** : réparation fuite en parallèle d'un échéancier de régularisation.
4. Signaler à la **cellule recouvrement** les dossiers avec réclamations sécurité/habitat (humidité, ascenseur).
`
  },
  {
    id: 'run-demengagement-1',
    automationId: 'auto-demengagement',
    date: '2026-06-14T07:15:00',
    report: `# Vigie déménagement / rotation — attribution locataire

## Principe

Changement de locataire récent (visible via **quittancement**) avec réclamations en attente sur le logement → vérifier si elles concernent l'**ancien** ou le **nouveau** locataire avant toute intervention.

## Rotations détectées (7 derniers jours)

| Logement | Ancien locataire | Nouveau locataire | Date entrée | Réclamations en attente | Attribuer à |
|---|---|---|---|---|---|
| Chenôve — apt 304, Les Tilleuls | M. P. (sortie 02/06) | Mme S. (entrée 08/06) | 08/06/2026 | #88412 « pas d'eau » · #88370 « traces humidité SDB » | #88412 → **nouveau** (post-entrée) · #88370 → **ancien** (pré-état des lieux) |
| Longvic — apt 112, Parc Bel Air | Mme V. (sortie 05/06) | M. et Mme T. (entrée 10/06) | 10/06/2026 | #88407 « radiateurs tièdes » | **Nouveau** — constat post-entrée |
| Quetigny — apt B204, Les Erables | M. L. (sortie 28/05) | — (vacant) | — | #88104 « odeurs égout » | **Vacant** — traiter avant relocation |
| Talant — apt 15, Le Plateau | Mme B. (sortie 01/06) | M. F. (entrée 06/06) | 06/06/2026 | #88087 « fuite chauffe-eau » | **À clarifier** — signalement jour entrée ; contacter les deux |

## Actions immédiates

1. **Chenôve 304** — scinder le dossier : humidité SDB → lien avec EDL sortie M. P. ; eau → chantier colonne (nouveau locataire informé).
2. **Talant 15** — appel M. F. et consultation EDL entrée avant envoi plombier.
3. **Quetigny B204** — intervention sur logement vacant prioritaire (curage en cours).
4. Mettre à jour les **tickets avec le bon contact locataire** avant planification technicien.
`
  }
]

export const MOCK_TICKET_REPLY_RUNS: TicketReplyRun[] = [
  {
    id: 'run-reply-nuit-1',
    automationId: 'auto-reply-nuit',
    date: '2026-06-16T02:00:00',
    summary: { total: 4, generated: 2, skipped: 1, errors: 1 },
    tickets: [
      { id_reclamation: 'REQ-88412', outcome: 'generated' },
      { id_reclamation: 'REQ-88407', outcome: 'generated' },
      { id_reclamation: 'REQ-88398', outcome: 'skipped_existing_draft' },
      {
        id_reclamation: 'REQ-88391',
        outcome: 'error',
        detail: 'Génération interrompue'
      }
    ]
  }
]

export const MOCK_AUTOMATIONS: Automation[] = [
  {
    type: 'report',
    id: 'auto-astreinte',
    name: 'Astreinte · Points chauds & Chantiers',
    description:
      "Avant chaque prise d'astreinte : scan des points chauds du secteur, avec rappel des travaux en cours pour éviter un déplacement inutile si la panne signalée est liée à un chantier.",
    status: 'success',
    lastRunDate: '2026-06-13T17:00:00',
    nextRunDate: '2026-06-20T17:00:00',
    owner: 'gensel',
    collaborators: ['hjoly', 'kndiaye', 'mperrin', 'abernard', 'croux', 'bleroy'],
    isCreator: true,
    runs: MOCK_RUNS.filter((r) => r.automationId === 'auto-astreinte'),
    maxReports: 6,
    frequency: 'weekly',
    frequencyDay: 'vendredi',
    frequencyTime: '17:00',
    prompt:
      'Génère un brief astreinte pour le week-end à venir. Inclure : points chauds du secteur, tableau des travaux en cours (résidence, nature, fin prévue, impact locataires), croisement pannes signalées / chantiers avec action recommandée (déplacement ou non), contacts utiles. Insister sur le rappel systématique : croiser toute panne avec les chantiers avant envoi astreinte. Graphiques (max 2–3, seulement si les chiffres du texte le justifient) : bloc ```plot``` JSON — types simples barY/barX (style Tufte) ou sankey pour les flux (links: source, target, value). Doc Plot : https://observablehq.com/plot/'
  },
  {
    type: 'report',
    id: 'auto-demengagement',
    name: 'GL · Insatisfaction des nouveaux entrants',
    description:
      'Repère les changements de locataire récents avec réclamations négatives en attente.',
    status: 'running',
    lastRunDate: '2026-06-14T07:15:00',
    nextRunDate: '2026-06-15T07:15:00',
    owner: 'pdurand',
    collaborators: ['cpetit', 'lolivier'],
    isCreator: false,
    runs: MOCK_RUNS.filter((r) => r.automationId === 'auto-demengagement'),
    maxReports: 6,
    frequency: 'daily',
    frequencyTime: '07:15',
    prompt:
      "Liste les logements avec rotation locataire sur les 7 derniers jours (sortie/entrée via quittancement) ayant des réclamations en attente. Pour chaque ticket : attribuer à l'ancien locataire, au nouveau, au logement vacant, ou « à clarifier ». Proposer actions (scinder dossier, contacter bon interlocuteur, EDL)."
  },
  {
    type: 'report',
    id: 'auto-locataire-recurrent',
    name: 'Tech · Immeuble à problèmes ?',
    description:
      'Repère les immeubles avec des réclamations répétées sur le même sujet malgré des interventions clôturées.',
    status: 'scheduled',
    lastRunDate: '2026-06-09T07:30:00',
    nextRunDate: '2026-06-16T07:30:00',
    owner: 'amartin',
    collaborators: ['cdubois', 'egirard', 'nrobert'],
    isCreator: false,
    runs: MOCK_RUNS.filter((r) => r.automationId === 'auto-locataire-recurrent'),
    maxReports: 6,
    frequency: 'weekly',
    frequencyDay: 'lundi',
    frequencyTime: '07:30',
    prompt:
      'Identifie les logements avec au moins 3 réclamations sur le même sujet en 12 mois malgré des interventions clôturées. Pour chaque dossier : historique, hypothèses (non-résolution vs vétusté), niveau de criticité, recommandation (diagnostic, travaux lourds, convocation locataire).'
  },
  {
    type: 'report',
    id: 'auto-vigie-saisonniere',
    name: 'Tech · Sécuriser le fonctionnement du chauffage avant l’hiver',
    description:
      "Avant l'hiver, identifie les immeubles dont les chaudières ou réseaux ont eu des incidents récurrents à la même période l'année précédente (objectif : anticiper les visites de contrôle).",
    status: 'paused',
    lastRunDate: '2025-10-15T07:00:00',
    nextRunDate: '2026-10-15T07:00:00',
    owner: 'hlemoine',
    collaborators: ['sxavier', 'tyilmaz', 'uzacharie', 'pdurand', 'osimon'],
    isCreator: false,
    runs: MOCK_RUNS.filter((r) => r.automationId === 'auto-vigie-saisonniere'),
    maxReports: 6,
    frequency: 'monthly',
    frequencyDay: '15',
    frequencyTime: '07:00',
    prompt:
      "Compare les incidents chauffage/chaudière d'octobre à décembre de l'année N-1 par résidence. Lister les bâtiments à risque (≥ 2 incidents même nature), dernière visite contrôle, priorité de visite préventive avant le 15 novembre. Proposer plan d'action pré-hiver."
  },
  {
    type: 'ticket_reply',
    id: 'auto-reply-nuit',
    name: 'Nuit · Réponses techniques non soldées',
    description:
      'Réponses automatiques (brouillon email) pour les réclamations techniques non soldées créées récemment.',
    status: 'scheduled',
    lastRunDate: '2026-06-16T02:00:00',
    nextRunDate: '2026-06-17T02:00:00',
    owner: 'gensel',
    collaborators: ['hjoly'],
    isCreator: true,
    skillId: 'ticket.answer-ticket',
    ticketFilters: {
      rules: [
        { kind: 'values', column: 'type_affaire', values: ['Technique'] },
        { kind: 'values', column: 'avancement', values: ['NON SOLDE'] },
        { kind: 'compare', column: 'date_creation', operator: 'gt', value: '2026-01-01' },
        { kind: 'values', column: 'colonne_supprimee_exemple', values: ['legacy'] }
      ]
    },
    maxRuns: 6,
    frequency: 'daily',
    frequencyTime: '02:00',
    runs: MOCK_TICKET_REPLY_RUNS
  }
]
