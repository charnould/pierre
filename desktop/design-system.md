# PIERRE — Design system

Apple Premium. Cubique dans l’outil. Accueil : exception colorée.

PIERRE n’est pas un dashboard SaaS. C’est un outil de travail intelligent. shadcn/ui est une collection de primitives techniques, pas une direction artistique. Si un écran est seulement _propre_, il n’est pas fini.

```
Tokens → Primitives (ui/* owned) → Patterns → Page types → Pages
```

**PAGE TYPE → PATTERNS → PRIMITIVES. Jamais l’inverse.**

Une page n’invente ni couleur, ni radius, ni hauteur de contrôle. Si ça manque : token, ou édition de la primitive. Jamais un wrapper. Jamais une variante de plus. Si un cas ne rentre pas dans ce contrat : s’arrêter et le signaler.

---

## 1. Philosophie

Loi : **cubique** dans l’outil. 90°. Une matière. Joints 1 px. Radius 6 px. **Exception écrite : l’accueil** — une scène composée (héros, bento, paper), pas un lanceur.

Premium = réduction, cohérence, densité maîtrisée, absence de bruit. Pas luxe. Pas glass. Pas vitrine.

- Hiérarchie plutôt que décoration
- Whitespace plutôt que filets répétés
- Typographie plutôt que couleur
- Surfaces sémantiques plutôt que fonds arbitraires
- Composition plutôt que cards
- Divulgation progressive plutôt que tout montrer
- Les contrôles disparaissent jusqu’au besoin

Hiérarchie, dans cet ordre : typographie → espacement → surface → densité → position → contraste. Ensuite seulement : filet, couleur, ombre.

---

## 2. Page types

Chaque vue React appartient à **exactement un** type. Les overlays ne sont pas des page types.

| Vue                | Type         |
| ------------------ | ------------ |
| Accueil            | Home         |
| Discuter           | Conversation |
| Réclamations       | Board        |
| Impayés            | Board        |
| Automatisations    | Directory    |
| Contacter par lots | Directory    |
| Synthèse           | Split        |
| Paramètres         | Document     |
| Login              | Login        |
| Assurances         | Placeholder  |
| Relocation         | Placeholder  |
| Attributions       | Placeholder  |
| Ventes             | Placeholder  |

### Home

Seule vraie scène. Paper, bento, `rounded-2xl` (12 px), pigments `--home-*`, héros chat. **Ne pas** la normaliser jusqu’à ressembler aux Boards ou Documents.

### Board

Réclamations et Impayés uniquement. Flush. DualTable protégé. Toolbar compacte. Header sticky. Lignes ~32 px. Rubrique, thead et lignes = `bg-background`. Pas de Card shell. Pas de h1 de page. Pas de KPI cards. Pas de pagination écran.

**Ne pas étendre DualTable** à Automatisations ou à d’autres collections.

### Split

Synthèse. Configuration → résultat. `Resizable`. Formulaire | output. Footer d’action `border-t`. Une primaire. Ce n’est pas un Chat.

### Document

Paramètres. `px-6` centré. `PageHeader`. Contenu documentaire / formulaire. Pas de `CardHeader` comme chrome de page. Paramètres **uniquement** : `max-w-4xl` + un filet 1 px (`rounded-md border p-4`) **par** paramètre (identité, compagnon, applicatifs, JSON). Login n’est **pas** un Document.

### Directory

Automatisations et Contacter par lots. Collection d’objets — ni Board ni Document. Flush. **Une rubrique par onglet** — même chrome que DualTable : `bg-background`, titre Inter `text-xl` + · + compte, CTA outline + une primaire. **Interdit :** fusionner les buckets. Liste paper (`DirectoryList`). Lignes **identité empilée** (nom + description, 2 lignes max) + **métadonnées en colonnes alignées à gauche** (`text-start` partout, y compris actions). Séparateur `border-border/60` **ou** whitespace, jamais les deux. Hover / selected = `bg-muted`. Recherche `InputGroup`. Automatisations : formulaire = Dialog `max-w-2xl`. Contacter par lots : éditeur **plein cadre**, corps centré `max-w-4xl px-6` (requête / résultats / envoi), pas de Dialog de formulaire. Historique d’un traitement = pile de rubriques flush (même chrome DualTable : Inter `text-xl` + · + méta), table Inter 13 / thead 11, un scroll, pas DualTable, pas Document ; clic ligne = même Inspector Impayés. Le corps **peut** grouper les champs par `FieldSet` + `FieldLegend` (16/24). Pas de `PageHeader`. Pas de Card comme shell. Pas de filet « un bloc = un paramètre » (Document). Pas de DualTable.

### Conversation

Discuter reprend la composition de `shadcn-ui/chatbot-template` : canvas initial vide, fil
`max-w-2xl`, user bubble `muted`, assistant sans bulle colorée et dock inférieur. Aucun greeting,
exemple ou suggestion. Anatomie : message → travail de l’agent → réponse → état. Raisonnement et
outils sont une preuve secondaire regroupée ; ils ne concurrencent jamais la réponse. Le
Questionnaire prend temporairement la priorité dans le dock sans recouvrir le fil.

### Login

Exception de **coquille**, pas de pattern. Petite fenêtre centrée, non resizable, taille non persistée (`LOGIN_WINDOW_BOUNDS`, 400×560). TitleBar native, pas de sidebar. Paper `bg-background`. Pas de Card, pas d’ombre, pas de gradient.

Pile intrinsèque (pas `flex-1`). `px-6 py-6`. Rythme 16 (`gap-4`) — le 24 Document ne tient pas.

Marque : SVG Koboyo `handover-login-system`, `currentColor` = encre, **64 px** de haut (`h-16 w-auto`, centré). Pas Empty 32, pas Home. `aria-hidden`. Titre : `h1.sr-only` « Connexion ». Pas de `PageHeader`.

Champs : `FieldLabel` 14 medium → `Input` `h-8` → `FieldError` 12 sous **ce** champ. Pas de `FieldDescription` sur serveur / email / mot de passe (placeholders = exemples). Pas de slot d’erreur réservé.

| Champ        | Erreurs                                        |
| ------------ | ---------------------------------------------- |
| Serveur      | URL invalide, réseau, API, cookie, 500         |
| Email        | vide, `unknown_user`                           |
| Mot de passe | vide, `wrong_password`, `wrong_root_password`  |
| Acceptations | les deux cases ; `FieldError` sous le **bloc** |

Acceptations : deux `Checkbox` + `FieldDescription` (12 muted), `gap-2`. Interdit : `FieldLabel` restylé en `text-xs`.

Une primaire intrinsèque (`w-fit`, pas `w-full`). Jamais `disabled` pour le légal — seulement `loading`. `overflow-hidden` — jamais de scrollbar. Loading : `Spinner` dans le bouton.

Bounds = TitleBar + `px-6 py-6` + pile **au repos** (marque 64 comprise). Un micro-saut 1–2 lignes `FieldError` est licite. Jamais un `max-w-2xl`.

### Placeholder

Assurances, Relocation, Attributions, Ventes. Uniquement Empty canonique. Pas de `p-8` / `text-lg` inventés. Pas d’illustration custom.

---

## 3. Application chrome

Le chrome global reste responsable **uniquement** du chrome global.

| Surface                 | Règle                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| TitleBar                | `h-8` `border-b` drag. Aucun padding de canvas.                                                                                           |
| Sidebar                 | icon-collapsed, `border-r`, items ghost, actif = `bg-muted`, tooltip sur les icônes                                                       |
| Canvas                  | `App.tsx` **ne décide plus** du padding par tab. Le page type compose sa surface. Un seul composant responsable du padding d’une surface. |
| Activity                | Drawer gauche 24 rem, même chrome que l’Inspector. Pas une page.                                                                          |
| Find-in-page            | Overlay flottant, `fixed`, `rounded-md`, `shadow-md`, `h-7`, `InputGroup`                                                                 |
| Reports HTML / mascotte | Hors arbre React. Ne pas les « shadcn-iser ».                                                                                             |

La fenêtre principale conserve les contrôles natifs de l’OS et un titre visible vide. Le drag
reste limité à la `TitleBar` ; ses contrôles sont `.no-drag`. Drawers horizontaux et leur
overlay s’arrêtent sous `--titlebar-height` — feux macOS et caption Windows restent hors
canvas, comme la sidebar.

---

## 4. Overlays

| Niveau                  | Usage                           | Chrome                                                                         |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------ |
| Transient               | Tooltip / Menu / Popover        | `rounded-md` `shadow-sm`                                                       |
| Confirm / petit éditeur | `ConfirmDialog`                 | Dialog `max-w-md` `rounded-lg` `shadow-md`                                     |
| Formulaire objet        | AutomationForm, etc.            | Dialog `max-w-2xl` `rounded-lg` `shadow-md`. Pas de Card interne.              |
| Inspector               | Dossier locataire / réclamation | Drawer 60 rem, 24 rem présent + 36 rem historique, paper, filet, `rounded-md`. |
| Workspace               | Plan d’apurement                | Plein canvas. Ne pas le réduire en Drawer ni en Document.                      |
| Inbox / suivi           | ActivityPanel                   | Drawer gauche 24 rem, même chrome que l’Inspector. Listes Directory.           |

Inspector ≠ Inbox / suivi ≠ Workspace. Inbox à gauche (24 rem), dossier à droite
(60 rem). Frères : aucun effet nested de réduction ou d’assombrissement du parent.

Sheet : fallback sidebar / mobile uniquement. Pas de pattern métier.

`window.confirm` est interdit. Utiliser `ConfirmDialog`.

---

## 5. Patterns

### PageHeader

Uniquement Document.

```
display 20/24  +  méta optionnelle 12 muted  +  actions outline/sm
```

Fichier : `src/shared/components/PageHeader.tsx`.

Pas de PageHeader dans Board, Directory, Split, Conversation, Home, Placeholder, Login. Pas de `CardHeader` utilisé comme faux PageHeader.

### Field

Une seule anatomie de champ :

```
Label → FieldDescription si elle informe → Control → FieldError
```

Regroupement des formulaires longs (éditeur Directory, Workspace) — pas une nouvelle primitive :

```
FieldSet
  FieldLegend (16)
  FieldGroup
    Field : Label → Description → Control → Error
```

- `FieldLegend` `variant="legend"` = titre de section 16/24 medium. `variant="label"` = 14, pour un FieldSet d’un seul cluster
- Pas de `FieldDescription` de section sauf si elle informe
- Portée : éditeur Directory, Workspace. Pas Board, pas Inspector, pas Paramètres (`FieldTitle` 14 + filet par paramètre)
- Placeholder ≠ description
- Ne pas utiliser `.pierre-meta` à la place de `FieldDescription`
- Ne pas utiliser `text-xs` pour les labels, **sauf** Inspector compose (`InspectorComposeField`, 12 medium)
- Ne pas utiliser `text-sm` pour les descriptions
- `FieldDescription` : `text-balance` (toutes les descriptions de label)
- `Field` est la seule primitive de formulaire Directory / Workspace. Inspector compose = `InspectorComposeField`. Ne pas créer un troisième système.
- Instructions d’automation (rapport) : contrôle markdown Lexical dans le chrome Textarea (`rounded-lg border-input`, `min-h-78`) + toolbar `h-7` ghost `icon-sm`. Contenu Inter 14, pas `typeset`. Features : gras, italique, titres, listes, tableaux, citations, code. Persisté en markdown oxfmt, jamais en JSON Lexical.

### Identité collègue

Deux anatomies, pas une.

**Liste de sélection** (suggestions `@`, affectation gestionnaire, combobox collaborateurs, facettes Gestionnaire) : `OrgUserListItem` — avatar + nom (L1 : displayName custom, sinon login) + login (L2 muted `text-xs`). Toujours les deux lignes, même si le nom retombe sur le login. L2 = le login réel, pas la racine d’email, pas `@login`. Fichier : `src/shared/components/OrgUserListItem.tsx`.

**Chip / cellule / mention dans un texte** : avatar + nom (displayName org, sinon login), chip `Badge` `h-5` comme colorize — pas `@login`. Même anatomie dans le snapshot et l’événement d’assignation.

### ChoiceTile

Une primitive pour tous les choix tuilés.

Fichier : `src/shared/components/ChoiceTile.tsx`.

Anatomie : outline, `rounded-md`, titre 14 medium, caption 12 muted si utile, icône 16, selected = `bg-muted`, pas de ring coloré hors focus.

Aliases minces autorisés : `SettingsFieldOptionTile`, `AboutSubjectCards`, `AutomationTypeCards`, `AutomationReplyFormatCards`. Pas quatre systèmes visuels.

### DirectoryList

Fichier : `src/shared/components/DirectoryList.tsx`.

Paper. `border-b border-border/60`. Hover / selected = `bg-muted` sur **toute** la ligne. `py-2` — plus de `h-8`. Jamais Card autour.

Une ligne = **grille partagée** (`DIRECTORY_ROW_COLUMNS` sur chaque `li`, pas `display: contents`) : identité empilée + métadonnées alignées + colonne actions **toujours réservée**. Entre colonnes : `gap-15` (60). La phrase génération reste `gap-1`. Ce n’est **pas** un DualTable : pas de `<table>`, pas de header sticky, pas de `colgroup`, pas de filtres par colonne.

```
[ nom 14 medium          ] [owner + viewers] ........ [dernière + statut → prochaine] [actions]
[ description 12 muted   ]
```

Hiérarchie dans la ligne :

| Zone        | Traitement                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Nom         | 14 medium, première colonne, ligne 1                                                                                                       |
| Description | 12 muted, `text-balance`, 2 lignes max (`max-h-[2lh]`) — pas de `line-clamp` (casse le balance)                                            |
| Accès       | Une colonne left-aligned : owner `sm` + `+` + `AvatarGroup` viewers (`-space-x-1`) ; `+N` au-delà de 10. L’espace libre est après le bloc. |
| Génération  | Phrase : date + pill colorize (`TableCellValue`, hex green/red) + `→` + date. `gap-1`.                                                     |
| Actions     | Colonne réservée (même vide), **left-aligned** (`text-start`) — Historique / Pin tombent au même x. Jamais `justify-end` / `text-end`.     |

Ne pas cacher ces informations dans le formulaire si elles servent au scan de la collection.

### Inspector

Overlay de dossier. Même famille : `RepaymentTenantDrawer`, `TicketReclamationDrawer`. Pas un page type. Pas un Rail. Pas un Workspace. Pas un Document.

Un Inspector inspecte **un** objet sélectionné sur un Board et permet d’agir sans quitter la liste. Depuis le centre Activity : le même Inspector (`embedded`) dans un Drawer droit frère, pas un troisième chrome.

```
Header (identité)                    — hors scroll, toute la largeur
┌─────────────────────┬─────────────────────┐
│ Gauche (un scroll)  │ Droite (un scroll)  │
│ Snapshot            │ Historique          │
│ À faire             │ (rail, plus récent  │
│ Présent + brouillons│  en haut)           │
│ inline              │                     │
└─────────────────────┴─────────────────────┘
```

Deux colonnes 24 rem + 36 rem (Drawer 60 rem). Deux scrolls indépendants. Le présent n’est pas un événement : il vit à gauche, sous l’état. L’historique est le seul rail à droite.

Ne pas réécrire la logique métier pour unifier le chrome. Unifier **cette** grammaire. Snapshot, verbes et corps d’événements restent spécifiques au dossier.

#### Principes

- Hiérarchie fixe : identité → état courant → action | historique
- Le présent n’est pas un événement. L’historique n’est pas un dashboard
- Divulgation progressive : Impayés, pile verticale (un rang = un métier) ; le brouillon **remplace** la pile. Réclamations : même règle
- Une filled maximum, et seulement si un prochain geste domine **cet** objet **dans cet** état. Sinon : tout outline
- 60 rem, pane gauche 24 rem, pane droite 36 rem. Si le formulaire ne tient pas dans la pane gauche, c’est le mauvais overlay
- Contrôles `sm` / chrome compact. Pas de padding Document. Pas de `PageHeader`

#### Header

Identité de l’objet + fermer. Rien d’autre.

- Titre objet = rôle encre (14 medium) s’il existe un nom humain
- Si l’objet **est** un identifiant (dossier locataire), le titre tient sur **une seule ligne** : `id_client · id_locataire` — Inter 14 medium, `tabular-nums`, `truncate`, pas JetBrains. Pas d’avatar générique ni de label décoratif
- IDs en sous-ligne (Réclamations) = Inter 13 regular, `tabular-nums`
- Les IDs ne sont jamais le substitut d’un statut ou d’un CTA
- Close : ghost `icon-sm`, toujours, y compris `embedded` (ferme l’Inspector, pas Activity)
- Interdit dans le header : verbes métier, badges de phase, dette, filtres, toolbar d’icônes

#### Corps — le snapshot

Hors du rail. Pas d’acteur, pas de date, pas un événement.

Une seule surface paper (`rounded-md`, filet). Même ossature que « À faire » : ancre `size-4` (`Box` muted, `mt-0.5`, inerte) alignée sur `Square` ; titre **Contexte** 14 medium (même cran que le libellé « À faire »). La grille méta commence 8 px sous le titre. La dette est la **première ligne méta** (label « Dette », montant · équivalent loyer `tabular-nums`, flèche de tendance dans la valeur). Ordre des lignes : Dette · Courriel · Téléphone · Référent · Groupe · Dernière action · Tags. Grille indentée : labels 12 muted, colonne `max-content`, valeurs 12 encre, chips compact `h-4` (phase, action, tags, collab, statut contact). Ligne **Tags** en dernier, masquée si aucun tag ; chips **inline** (`flex-wrap`), pas un chip par ligne. Seuls les libellés encore dans `customization/repayments/config.ts` s’affichent. Chips tags = une paire hex unique (`#E8E8E8` / `#333333`), pas de palette auto, pas de Coloriser DualTable. Pas d’icônes Lucide en tête de ligne méta. Pas de répétition des IDs du header. Pas de grille de KPI. Pas de date de bail (colonne ledger). Colorize = fill + encre + filet 1 px `color-mix(bg 72%, text)` (hex métier ou palette algo), **pas** de swatch / carré en tête, **pas** de `border-border` taupe sur un fill hex. Identité collab chip = avatar + nom (displayName org, sinon login), compact `h-4` comme « À faire » — pas `@login`, pas `h-5` Board. Liste de sélection = `OrgUserListItem` (avatar + nom + login). Voir **Identité collègue**.

#### Corps — à faire

Seconde surface paper, sous le snapshot, hors rail. Masquée s’il n’y a aucune action `a_faire`. Elle affiche uniquement le dernier snapshot ouvert de chaque tâche et constitue son unique surface live. Chaque rang : ancre `Square` muted `size-4` `mt-0.5` (clic = réaliser), même cran que `Box` ; EyeOff `size-4` (ignorer, même boîte que l’ancre) ; Pencil `size-4` pour éditer/réassigner si autorisé ; Trash2 `size-4` pour supprimer si créateur ; libellé entier (`whitespace-pre-wrap`, pas de truncate) ; puis méta `text-xs` — échéance `DD/MM/YYYY`, assigné, créateur (labels et valeurs muted), note optionnelle (label muted, corps `text-foreground`) — chips `h-4` alignés (grille, colonne labels `max-content`) ; icônes de valeur (Calendar, avatars) sur le même axe (`ps-px`, pas `px-1.5` sur le badge date). La note, si elle existe, vient après Créé par et wrappe (`RepaymentMentionText`, `items-start`). EyeOff, Pencil et Trash2 `text-muted-foreground` (même cran, pas `destructive`). Tooltip au-dessus de chaque icône : Ignorer / Modifier / Supprimer. Édition = flip Y du **rang entier** (deux faces CSS, `preserve-3d`, `backface-visibility`) ; verso **sans** ancre Square ni intitulé. ~200 ms, `cubic-bezier(0.23, 1, 0.32, 1)` ; `prefers-reduced-motion` = swap immédiat. Verso : Assigné à (trigger `OrgUserListItem` outline + Popover portail, pas une liste inline) · Échéance (`DatePicker` compact `h-7`) · Note (`RepaymentMentionTextarea`) · Annuler / Enregistrer. Tout le monde peut réaliser ou ignorer (motif optionnel). Chaque création, modification, réalisation, ignorance ou réouverture produit en parallèle une entrée distincte dans la timeline.

#### Corps — le présent

Colonne gauche, sous snapshot / à faire. Pas un événement : pas d’avatar, pas de date, pas de « peut agir ». Pile de verbes outline en grille intrinsèque : tous les rangs prennent la largeur du plus long libellé, jamais toute la pane, avec `gap-1`. Filet `border-border/60`, hover `bg-muted`. Bord gauche = cards (padding du pane), icônes CTA sur la **même colonne** que Contexte / À faire (`size-4`, inset `px-3`), `text-muted-foreground` comme `Box` / `Square`, centrées avec le label (`items-center`), pas le rail historique. Le brouillon **remplace** la pile. L’acteur n’apparaît qu’à droite, après envoi.

**Composer** — une seule surface, rendue par `InspectorComposeShell` (jamais par le formulaire métier). Au repos : la pile. Actif : la pile disparaît, le shell la remplace. `rounded-md border-border/60 shadow-none ring-0` — plus discret que Contexte / À faire (`border-border`). En-tête : icône 16 muted + titre 14 medium reprenant le CTA. Labels visibles `InspectorComposeField` 12 medium ; contrôles 14 ; principaux `h-8`, DatePicker / actions compactes `h-7`. Espacements 8 intra-groupe, 16 entre groupes. Footer : `Annuler` outline + **une** primaire sémantique (`Ajouter` · `Planifier` · `Consigner` · `Enregistrer` · `Affecter` · `Envoyer`). Placeholders = exemples, jamais le seul label. Date = `DatePicker` partagé, valeur `YYYY-MM-DD` **locale** (pas `toISOString()`). Collaborateur = popover portail (`CollaboratorPopoverPicker`), pas Command inline. `prefers-reduced-motion` = swap immédiat.

États : `idle` (saisie) · `submitting` (champs et actions disabled, `aria-busy`) · `success` (reset + pile) · `error` (toast existant, brouillon intact). Reset **uniquement** si la soumission renvoie `true`. Annuler = reset volontaire, pas d’appel réseau. Focus : premier champ à l’ouverture ; CTA déclencheur après Annuler / succès.

**Impayés** — pile verticale `w-fit`, outline, icône 16 + label 14 medium, un rang = un métier. Ordre et libellés : `Laisser une note` · `Créer une tâche` · `Consigner une action réalisée` · `Contacter un tiers` · un rang Plan d’état (`Créer un plan d’apurement` / `Modifier le plan d’apurement` / `Clôturer le plan d’apurement`) · `Importer un email` · `Changer le groupe` · `Changer les tags` · `Affecter à un référent` ou `Réaffecter à un référent`. Pas de liste d’actes dans la pile. Tâche = Action (requis) · Qui (défaut = utilisateur courant) · Quand (défaut = aujourd’hui ; une échéance aujourd’hui est licite) · Note optionnelle · primaire `Planifier`. Action déjà réalisée = Action (requis) · Note optionnelle · primaire `Consigner`. `Contacter un tiers` = menu groupé par `group` (ordre `template_groups` ou alpha `fr`) ; `channel: rcs` et `channel: email` = revue inline, labels visibles ; `channel: mailto` = client mail puis `ConfirmDialog`. `Importer un email` = sélecteur `.eml` uniquement, parse immédiat, pas de preview, pas de drag-and-drop, pas de Dialog. Plan = un verbe exclusif qui **quitte** vers Workspace (Clôturer = canvas read-only, motif inchangé). Groupe, tags et référent = brouillons dans le même shell.

**Réclamations** — même pile, même shell, mêmes labels 12 / contrôles 14. Cinq verbes : `Ajouter une note` · `Envoyer un RCS au locataire` · `Envoyer un courriel au locataire` · `Envoyer un courrier postal au locataire` · `Générer un point de situation`. IA / brouillon / export restent des actions métier dans le footer, sans deuxième filled dominante.

Pas de `DrawerFooter`. Pas de nested drawer. Dialog : `ConfirmDialog` (irréversible, « e-mail envoyé ? »). Un travail canvas (plan d’apurement) **quitte** l’Inspector vers Workspace. Pas une primaire de page permanente.

#### Corps — l’historique

Rail 1 px `border-border/60` et avatar d’acteur **uniquement à droite** :

**Acteurs.** Nœud `size-8` (`Avatar` défaut), bord gauche sur la colonne des cards — pas le 40 Activity. Collègue = kit avatar. Pierre (`agent` / `automation` / `system`) = compagnon en **cercle** (couleur settings, visage, sans pastille) ; la silhouette bureau (galet, goutte…) ne s’y copie pas. Fait système = cachet `--timeline-database` + glyphe registre (`BookMarked`). Pas Lucide `Bot` / `Database`.

```
L1  Date = formatter Inspector (`JJ/MM/AAAA · HHhMM`, `.pierre-meta` muted, jamais relatif)
L2  Acteur + verbe au passé     (12, encre ; verbe `font-normal`)
    Corps selon l’ontologie
```

Réclamations : L1 peut porter la méta d’acheminement (badge). Impayés : communications = pied de card, pas L1.

| Ontologie         | Corps                                                                                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contenu           | Surface filetée (citation), pas un Card                                                                                                                                                       |
| Courriel Impayés  | Surface filetée : objet visible ; corps repliable, fermé par défaut ; état d’acheminement en pied (11, muted). Import `.eml` : même card, pied `De … · À … · Envoyé le …`, pas d’acheminement |
| Transition d’état | Phrase unique L2 ; corps = note si elle existe, pas avant → après                                                                                                                             |
| Fait système      | Acteur base ; montant / solde                                                                                                                                                                 |
| Artefact          | Titre + statut + ouvrir (si Workspace)                                                                                                                                                        |

Actions **de l’événement** : elles n’entrent pas dans la pile du présent. `outline` `xs` (même filet que les verbes du présent). Répondre = toujours visible. Modifier / Supprimer = visibles au hover / focus-within. Boost = emoji dans un `outline` `xs`, pas un label « Boost ». **Supprimer** (note) / **Supprimer la tâche** : créateur seul ; hard delete = tout le thread.

Une entrée de tâche dans l’historique est une phrase L2 wrappable, même registre 12 : acteur texte + verbe + chips (`Badge` `h-4` pour le libellé, `CollaboratorChip` compact pour le responsable, `Badge` date + Calendar pour l’échéance). Création, réalisation et réouverture portent la même suite « assignée à » / « pour le ». L1 reste la date de l’événement. Le corps ne reprend ni le titre ni les métas — seulement note / résultat / motif s’ils existent. Seul le dernier événement `completed` du cycle peut proposer `Rouvrir la tâche` en `outline` `xs`. L’ancre Square, l’ignorance, l’édition et la réassignation restent dans la surface « À faire ».

Une entrée courriel Impayés est la même phrase L2 : acteur + « a » + chip du libellé `action` + « par e-mail » (le médium vient du `type` d’activité, pas du `channel` du modèle : `mailto` journalise en `email`). L1 = date seule. Le corps est une surface filetée : objet toujours visible ; corps du message repliable, fermé par défaut ; en pied, une ligne 11 muted `Envoyé vers … · état au …` (RCS, courrier et autres communications : même pied). Pas de checkbox ni de Badge de statut. Un courriel importé (`.eml`) : L2 « a importé un courriel » ; L1 = date d’upload ; même card objet/corps ; pied `De … · À … · Envoyé le JJ/MM/AAAA · HHhMM` en clair. Pas de Dialog. Pas de drag-and-drop.

Une transition d’état (groupe, affectation, réaffectation, tags) est aussi une phrase L2 unique : « a déplacé le dossier du groupe … vers … », « a affecté le dossier à … », « a réaffecté le dossier de … à … », « a mis à jour les tags » + chips du snapshot (ou « Aucun tag »). Le corps ne reprend pas avant → après — seulement la note si elle existe, même registre 12 muted que les tâches.

Statut courant (snapshot) et transition (historique) **coexistent**. Ni l’un ni l’autre ne remplace l’autre.

Chrono descendant. Ouverture = haut. Highlight depuis Activity = selected `bg-muted` sur **toute** la ligne (avatar compris, flush au padding du body), breathing vertical 8 px, apparition 280 ms (`animate-inspector-highlight`), sans radius et sans `px-*`. Scroll **de la colonne droite**. Timelines longues : un scroll, expansion progressive, pas de pagination écran, pas de « Afficher plus » comme chrome.

#### Densité

Registre compact — celui du chrome `h-7`, pas du Document. Padding interne = flush Board (16). Présent : pas de rail, même inset que les cards. Rail historique (colonne droite) : `px-3` + nœud `size-8` + `ms-10` (32 + 8), bord gauche = ancre cards 16. Un seul padding responsable. Dates = token dates. Corps d’événement = soutien (12).

#### États

| État                | Traitement                                               |
| ------------------- | -------------------------------------------------------- |
| Loading initial     | Skeleton présent à gauche, 2 rangs d’historique à droite |
| Loading incrémental | Le chrome déjà à l’écran suffit                          |
| Historique vide     | Le présent reste. Pas d’Empty pleine surface             |
| Aucun verbe         | Réclamations : snapshot seul. Impayés : la pile reste    |
| Erreur d’action     | toast error ; le brouillon compose reste ouvert          |
| Erreur irréversible | `ConfirmDialog`                                          |

Interdit : « Chargement… » comme titre ou faux écran ; Spinner centré qui remplace le chrome ; Empty page-like alors que le présent est déjà là.

#### Superposition (depuis Activity)

Même Inspector. Même header. Même corps. Sa fermeture révèle l’inbox 24 rem restée à gauche.
Le Drawer droit est un frère, pas un Drawer nested. Ne pas substituer une liste
`Item` / un troisième chrome.

Motion Inspector : le shell entre depuis la droite avec la primitive Drawer. Le header puis le
split se révèlent dans le même sens (`transform` + `opacity`, 35–65 ms d’écart), sans différer
l’affichage du shell pendant le chargement métier. Révélation du contenu `220 ms` maximum, sortie
`120 ms`. Tous les Inspectors partagent `INSPECTOR_DRAWER_CLASS` ; pas d’override métier local.

Le changelog Updates n’est **pas** un Inspector : exception ActivityReader.

#### Variations autorisées

- Contenu du snapshot
- Ensemble et ordre des verbes / liens (dans la grammaire ci-dessus)
- Renderers de corps d’événement
- Sortie Workspace
- Actions locales par type d’événement
- `embedded` (hôte Drawer droit frère fourni par Activity)

#### Anti-patterns Inspector

- Footer sticky / `DrawerFooter`
- Toolbar d’actions dans le header
- Deux filled
- `PageHeader`, `h1`, `.pierre-display`
- Card comme shell du body, ou plusieurs Cards
- `rounded-lg` à l’intérieur
- DualTable ou copie des colonnes Board
- Pagination, KPI, padding Document
- Empty pleine surface pour un historique vide
- Compose avancement, note, tâche ou action dans un Dialog. Brouillons = `InspectorComposeShell`, Annuler outline + une filled
- Sheet métier (`TicketsActivityDrawer` et équivalents)
- Troisième chrome « lecture seule » à côté de l’Inspector
- Liste d’actes ou formulaire Document dans le rail Impayés (actes = brouillon inline)
- Nested drawer dans l’Inspector
- Wizard / Questionnaire shadcn dans l’Inspector (Suivant, progression, une question à la fois)
- Primaire permanente « parce que le Directory en a une »
- Highlight d’événement en Card paddé (`bg-muted` + `rounded-*` + `px-*`) ou voile limité au contenu (avatar dehors)

### Split

Formulaire à gauche, résultat à droite, `ResizableHandle`, footer `border-t`, une primaire. Empty canonique dans le panneau output. Card bornée `max-w-sm` uniquement pour un objet unique (ex. tables datastore).

### Conversation

Composition `shadcn-ui/chatbot-template`, adaptée au desktop Pierre. Fil et dock partagent
`max-w-2xl px-6`. Rythme fermé : 24 entre tours, 16 entre travail et réponse, 8 à l’intérieur d’un
bloc. Le sélecteur de profil est le seul raccord visuel Pierre.

Le travail de l’agent regroupe chaque suite contiguë de raisonnement et d’outils dans une seule
divulgation. En `full`, elle est ouverte uniquement pendant l’activité puis se referme ; en
`partial`, elle reste fermée ; en `off`, le raisonnement est masqué mais les outils restent
consultables. Une fois terminé, son résumé porte durée et nombre d’outils. Les détails sont
chronologiques : résumé et ligne d’outil en 12, raisonnement et sortie technique en mono 11/16.
JSON, stdout et contenus techniques équivalents ont une divulgation secondaire fermée par défaut,
même pendant le stream ; les réponses `ask_user` restent inline. Erreur ou interruption reste
visible sous une réponse partielle, sans seconde alerte.

Le dock inférieur contient le Questionnaire prioritaire puis le composer compact. Il est hors du
viewport scrollé : aucune surface ne recouvre la dernière réponse. L’état vide conserve seulement
ce composer. Conversation autorise `rounded-xl` pour la bulle utilisateur et le composer, et
`rounded-2xl` pour le Questionnaire, comme surfaces conversationnelles bornées ; aucune ombre de
page et aucun radius supplémentaire.

Le dépôt de pièces jointes cible tout le canvas mais désigne visuellement le composer : voile
paper sans blur, instruction centrée et ring de focus du `InputGroup`. Le survol reste neutre car
Electron ne garantit pas l’extension avant le drop. Après validation, les fichiers vivent dans le
composer avec `InputGroupAddon` + `ItemGroup` / `Item` `xs`, miniature image éventuelle,
`FieldError` inline et retrait `InputGroupButton` ghost. Aucun Dropzone, Card, Dialog, dashed ou
toast. `dragover` ne déclenche aucun rendu ; les octets ne sont lus qu’à l’envoi. Dans le fil, les
mêmes `Item` deviennent read-only sous la bulle utilisateur.

Pendant le stream, les nouveaux mots reprennent le reveal `blurIn` de Streamdown (200 ms,
stagger 40 ms, backlog borné à 24 mots) et le dernier bloc textuel porte un caret `▋`. Outils et
questionnaire ne sont jamais différés. `prefers-reduced-motion` supprime le reveal et le blink.

### Contenu généré

Tout Markdown généré converti en HTML utilise `typeset` (`src/typeset.css`). Ne pas recréer un
rythme de prose avec des variants locaux et ne pas ajouter `@tailwindcss/typography`. Utiliser
`not-typeset` pour exclure un sous-arbre et `.typeset-scroll` autour des tables GFM larges.
Discuter utilise `react-markdown` + `remark-gfm` dans `typeset`, sans Streamdown.

### Workspace

Plan d’apurement. Plein canvas. Field canon à l’intérieur. Une primaire. Secondaires outline.

### Charts

La tendance de dette du tiroir Impayés est une flèche Lucide (`MoveUpRight` / `MoveDownRight` /
`Minus`) dans une boîte `size-4` `rounded-md` sur le titre Dette du snapshot : wash `/10` + encre
`--pierre-debt-up` / `--pierre-debt-down` (stable = `bg-muted` + `text-muted-foreground`). Pas de
fill saturé. Les rapports HTML restent hors React et utilisent ECharts.

### Empty / Loading / Error

**Empty** — toujours la primitive `Empty`, sauf Inspector historique vide (le présent suffit).

| Contexte                    | Titre                                              | Icône                         |
| --------------------------- | -------------------------------------------------- | ----------------------------- |
| Page / liste / drawer       | `.pierre-display` (20/24) — défaut de `EmptyTitle` | Koboyo 160, fill, pas de wash |
| In-table (bucket DualTable) | `className="text-sm leading-5 font-medium"`        | Koboyo 32, fill, pas de wash  |
| Inspector, historique vide  | _(pas d’Empty — le présent suffit)_                | —                             |

Description : 12/16 muted. CTA outline. Pas de dashed. Pas de nouvelle famille Empty.

**Loading** — Spinner ou Skeleton dans le chrome existant. Jamais une page de cards vides. Jamais « Chargement… » comme faux écran de page.

**Error**

| Kind         | Pattern                                      |
| ------------ | -------------------------------------------- |
| Champ        | `FieldError`                                 |
| Action       | `toast.add({ type: 'error' })` + retry ghost |
| Page         | Empty + description + action outline         |
| Irréversible | `ConfirmDialog`                              |

---

## 6. Tokens

### Couleur

Light only. Pas de `.dark`. Thème shadcn taupe.

| Token               | Rôle                               | Tailwind                       |
| ------------------- | ---------------------------------- | ------------------------------ |
| `background`        | page, card, popover, titlebar      | `bg-background`                |
| `foreground`        | encre                              | `text-foreground`              |
| `muted`             | hover, selected                    | `bg-muted`                     |
| `muted-foreground`  | méta, descriptions, placeholders   | `text-muted-foreground`        |
| `border`            | joints structurels                 | `border-border`                |
| `input`             | contrôles                          | `border-input`                 |
| `primary`           | actions filled                     | `bg-primary`                   |
| `destructive`       | erreur                             | `text-destructive`, wash `/10` |
| `ring`              | focus only                         | `ring-1 ring-ring/40`          |
| `pierre-debt`       | montant dette                      | `text-pierre-debt`             |
| `unread`            | dots / badges non-lus, alias encre | `bg-unread`                    |
| `unread-foreground` | papier sur badge non-lu            | `text-unread-foreground`       |

**Interdit :** `gray-*`, `slate-*`, couleurs arbitraires de chrome, gradients hors Home, couleur pour créer une hiérarchie.

**Exceptions légitimes :** pigments Home, `--pierre-debt`, hex métier des statuts (données, pas chrome), couleurs data / charts.

### Typographie

Inter + JetBrains Mono. Pas de Lora. Pas d’autre famille. Inter pour toute donnée d’interface (IDs, montants, dates, en-têtes de colonnes) + `tabular-nums` sur les chiffres. JetBrains **uniquement** pour le littéral (JSON Paramètres, `<pre>`, raisonnement).

| Rôle                  | Taille            | Poids               | Classe / primitive                                       |
| --------------------- | ----------------- | ------------------- | -------------------------------------------------------- |
| Page / Empty title    | 20/24             | medium              | `.pierre-display`                                        |
| Board section         | 20/24             | semibold            | rubrique Inter `text-xl`                                 |
| Form section          | 16/24             | medium              | `FieldLegend` `variant="legend"`                         |
| Encre / label / nom   | 14/20             | medium              | `FieldLabel`, `FieldTitle`, `CardTitle`, titre ID        |
| Valeur                | 14/20             | regular             | body                                                     |
| Soutien / description | 12/16             | regular muted       | `FieldDescription` (`text-balance`), `.pierre-meta`      |
| Erreur de champ       | 12/16             | regular destructive | `FieldError`                                             |
| Data / IDs            | 13/20 Inter       | regular             | DualTable, sous-ligne drawer, Directory + `tabular-nums` |
| Dates / horodatages   | 13/20 Inter       | regular             | `tabular-nums`                                           |
| Table header          | 11/16 Inter muted | medium              | `DataColumnHeader` — `text-[0.6875rem]`                  |
| Dette                 | 20/24 Inter       | medium              | `.pierre-debt-amount`                                    |

`.pierre-meta` : 12/16 muted, **sans** `tracking-wide`. Signatures `globals.css` : `.pierre-display`, `.pierre-meta`, `.pierre-debt-amount`.

**Tables = Inter `text-[0.8125rem]` (13)** pour les cellules, `font-sans tabular-nums` sur le `<table>`. **En-têtes = Inter `text-[0.6875rem]` muted**. **Alignement = `text-start` partout** (y compris montants). Jamais `font-mono` ni `text-end` en cellule. JetBrains : JSON, `<pre>`, raisonnement. Pas de classe `.pierre-data`.

Hiérarchie par poids, contraste, position, taille — pas uniquement par couleur.

### Spacing

Échelle fermée de rythme de page : **4 / 8 / 16 / 24**.

Ne pas introduire comme rythme de page : 12, 20, 32, 48.

| Usage                                   | Valeur                    |
| --------------------------------------- | ------------------------- |
| Anatomie champ (label → desc → control) | 8 (`gap-2`)               |
| Entre champs                            | 16 (`FieldGroup` `gap-4`) |
| Padding flush (Board, Split, Directory) | 16                        |
| Document                                | 24 (`px-6`)               |

Ne pas empiler App + vue + enfant.

### Heights

| Surface                                                 | Hauteur                                  |
| ------------------------------------------------------- | ---------------------------------------- |
| Contrôles                                               | 32 (`h-8`)                               |
| Chrome compact / toolbar / table header / drawer chrome | 28 (`h-7`)                               |
| Lignes DualTable                                        | ~32                                      |
| Lignes Directory                                        | ~48–56                                   |
| TitleBar                                                | 32                                       |
| Empty icon                                              | 160 (`size-40`) ; 32 in-table (`size-8`) |
| Login marque                                            | 64 (`h-16`)                              |
| Avatar Inspector cards (euro / checkbox)                | 16 (`xs`)                                |
| Avatar Inspector rail                                   | 32 (défaut)                              |
| Avatar Activity                                         | 32 (défaut)                              |

`h-7` uniquement dans les patterns nommés « sm » : toolbar / table / drawer / chrome.

### Widths

| Surface                                         | Largeur                          |
| ----------------------------------------------- | -------------------------------- |
| Document (Paramètres)                           | `max-w-4xl`                      |
| Login                                           | coquille (`LOGIN_WINDOW_BOUNDS`) |
| Confirm                                         | `max-w-md`                       |
| Form dialog                                     | `max-w-2xl`                      |
| Inspector                                       | 60 rem (24 rem + 36 rem)         |
| Inbox / suivi                                   | 24 rem                           |
| Card bornée                                     | `max-w-sm`                       |
| Board / Directory / Split / Conversation / Home | 100 %                            |

### Radius

| Contexte       | Token          | px  |
| -------------- | -------------- | --- |
| Canvas         | `rounded-md`   | 6   |
| Overlay        | `rounded-lg`   | 8   |
| Home           | `rounded-2xl`  | 12  |
| Badge / avatar | `rounded-full` | —   |

Interdit : `rounded-lg` / `xl` / `2xl` sur le canvas hors Home.

### Borders / shadows

| Border             | Usage                                                               |
| ------------------ | ------------------------------------------------------------------- |
| `border-border`    | joints structurels, shell, split, footer, table                     |
| `border-input`     | contrôles                                                           |
| `border-border/60` | lignes de liste **ou** whitespace — jamais les deux + grand padding |

| Shadow      | Usage                        |
| ----------- | ---------------------------- |
| aucune      | page                         |
| `shadow-sm` | menu, tooltip                |
| `shadow-md` | dialog, drawer, find-in-page |

### States

| État              | Traitement                            |
| ----------------- | ------------------------------------- |
| Hover             | `bg-muted`                            |
| Focus             | `ring-1 ring-ring/40`                 |
| Selected / active | `bg-muted`                            |
| Disabled          | `opacity-50`                          |
| Invalid           | `border-destructive` + ring `/20`     |
| Destructive       | texte + wash `/10`, pas de pavé rouge |
| Active press      | `scale-0.96` — ne pas retoucher       |

### Icons

Lucide pour sidebar et toute l’interface (canvas / nav / tuiles : 16. Chrome sm : 14. Autres : stroke 1.5). Cloche Notifications : stroke only, jamais `fill-unread`. Empty : Koboyo 160, fill, `currentColor`, pas de wash — pas Lucide. In-table (bucket DualTable) : Koboyo 32. Exception Login : marque Koboyo 64.

---

## 7. Tables et listes

### DualTable — Boards uniquement

Paper continu. Pas de Card. Deux `<table className="table-fixed font-sans text-[0.8125rem] leading-5 tabular-nums">` + deux `colgroup`. Scroll H sync. Headers sticky `h-8`. `DataColumnHeader` : label Inter 11 muted + menu Filter. Pas de pinning, pas de DnD. Lignes ~32, `hover:bg-muted/50`. Cellules = Inter 13, `tabular-nums`, **`text-start`**. En-têtes colonnes = Inter `text-[0.6875rem]`, aussi à gauche. Empty / loading dans la table. Virtualisation si nécessaire.

Rubrique, thead et lignes = `bg-background`. Hiérarchie par filets, typo (rubrique Inter `text-xl` / colonnes Inter 11 px / cellules Inter 13), pas par fond. CTA rubrique = `variant="outline"` stock. Impayés = pile de rubriques (`RepaymentBucketSection`). Tickets = une rubrique. Pills colorize (`TableCellValue`) = `Badge` + label ; couleur = fill + encre + filet mix(bg, text), pas de swatch. **Interdit :** fusionner les buckets, KPI cards, DualTable hors Board, lavage de chrome, `text-end` en cellule ou en-tête.

### Directory / Activity

Paper. Hover / selected `bg-muted`. Séparateur `/60` ou whitespace. Jamais Card autour. IDs = Inter `tabular-nums`. Dates / horodatages = Inter `tabular-nums`, jamais JetBrains. **Alignement = `text-start` partout** (identité, accès, génération, actions) — jamais `text-end` / `justify-end` dans la ligne. Directory = une rubrique par onglet (Automatisations, Contacter par lots) — identité empilée (nom + description, 2 lignes max) + métadonnées en colonnes alignées, grille partagée, colonne actions réservée. Historique d’un traitement de masse = pile de rubriques + table Inter 13, pas `DirectoryList`, pas DualTable. Interdit de fusionner les buckets.

Activity : même Drawer que l’Inspector (`rounded-md border`, inset `0.75rem`),
à gauche, 24 rem (pane présent), sous la TitleBar. Le dossier reste à droite,
60 rem. Pas de poignée. Deux rangées. 1 : Tabs default à icônes (`Bell`
Notifications, `Activity` Activités) + fermer `icon-sm`. Titre `sr-only`.
2 (`py-1.5`, sous les onglets, sans filet) : Notifications = deux `outline` `sm`
(local, pas persisté) « Afficher les lues et non-lues » / « Afficher uniquement
les non-lues » + « Tout lu » si des non-lues ; Activités = « Suivre des
collaborateurs · N » à gauche.
Pas de ` · N` dans l’onglet (badge sidebar encre / pastille mascotte
`badgeColor` uniquement sur le compagnon). Pages de 50,
sentinelle en bas des deux listes. « Notifications » = non-lues
(`source !== activity`) sauf après le verbe lues ; voile + « Non lu » sur les
lues. « Activités » = auteurs
suivis, soi compris. Notifications = Directory — date 12 muted regular
(Aujourd’hui / Hier ; sinon `Samedi 29 août`, pas en capitales), dossier 14
medium, L1 expéditeur, L2 mention, méta 12. Activités = **même frise que
l’historique Inspector** (`ContextTimeline` : rail 1 px, avatar `size-8`,
L1 date `JJ/MM/AAAA · HHhMM`, puis `module · ref` 12 muted, L2 acteur + verbe,
corps). Pas de hover `bg-muted`.
Une frise continue. Pas de titres de jour. Pas de `h3` dossier. Personne
suivi : le corps est le sélecteur. Ensuite la 2e rangée porte « Suivre des
collaborateurs · N ». Clic → Inspector
droit frère ; l’inbox 24 rem reste. Sur une fenêtre étroite les deux
peuvent se recouvrir. **Pas un DualTable, pas un Drawer nested.**

Motion Activity : la cloche ne sonne jamais en boucle. Une hausse du compteur déclenche un unique
burst court ; ouvrir le centre ne le rejoue pas. Le shell entre depuis la gauche avec la primitive
Drawer, puis header, actions et contenu se révèlent dans ce même sens. Les six premières lignes
seulement sont décalées (`30 ms`, `transform` + `opacity`) ; pagination et interaction restent
immédiates. Le changement d’onglet déplace un indicateur partagé, sans animation du contenu métier.
Le fallback `prefers-reduced-motion` reste celui de `globals.css`, sans logique locale.

### Toolbars

`h-7`, buttons `sm`, ghost / outline, une seule barre. Search = `InputGroup`, une instance visible. Board : filtres dans le menu de colonne. Find-in-page = overlay distinct.

---

## 8. Accessibilité

Focus visible (`ring-1 ring-ring/40`). Contraste AA body. `prefers-reduced-motion` honoré (`globals.css`). Contrôles nommés. Pas d’interaction souris-only. `prefers-contrast: more` → muted-foreground = ink.

---

## 9. Responsive Electron

Fenêtre desktop, pas un site. Pas de breakpoint mobile comme cible. Largeur utile : table + Inspector 60 rem ; inbox 24 rem à gauche. TitleBar drag ; contrôles `.no-drag`. Sheet uniquement en fallback sidebar.

---

## 10. Anti-patterns

Ne pas introduire / supprimer :

- gap hors 4/8/16/24 comme rythme de page
- `text-xs` pour les labels (sauf Inspector compose)
- `text-sm` pour les descriptions
- `.pierre-meta` à la place de `FieldDescription`
- override local des primitives
- nouvelle variante Button / Badge / Input
- Card comme page shell, form shell, ou Directory shell
- padding conditionnel par tab dans `App.tsx`
- `p-6` sur un enfant déjà paddé
- h1 sur Board / Split / Conversation
- `rounded-lg` / `xl` / `2xl` sur canvas hors Home
- ombre de page
- deux primaires visuelles sur une même surface
- `size="lg"` comme défaut
- Empty bricolé
- `window.confirm`
- DualTable hors Board
- KPI cards
- `text-end` / `justify-end` dans un DualTable ou une ligne Directory
- couleur de chrome pour hiérarchiser
- nouvelle famille de police
- ChoiceTile local
- Sheet métier
- pixel-perfect d’un écran contre le contrat
- préfixe « DEMONSTRATION - » comme chrome
- `CardHeader` utilisé comme PageHeader
- `.pierre-display` / `PageHeader` / `text-xl` comme titre de section dans le corps d’un formulaire
- `FieldTitle` 14 comme faux titre de section dans l’éditeur Directory
- Login étiré en Document (`max-w-2xl`, `overflow-y-auto`)
- `DrawerFooter` / footer sticky dans un Inspector
- Toolbar métier dans un header de Drawer
- Troisième chrome de dossier à côté de l’Inspector (`ItemGroup`, Sheet)
- Empty pleine surface dans un Inspector dont le présent est déjà rendu

---

## 11. Exceptions volontairement conservées

| Exception                             | Pourquoi                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Home `rounded-2xl` + pigments + bento | Seule scène                                                                 |
| Hex des statuts                       | Données métier, pas chrome                                                  |
| `--pierre-debt`                       | Montants uniquement                                                         |
| `--unread`                            | Alias `--foreground` pour dots / badges ; pastille compagnon = `badgeColor` |
| Reports HTML                          | Hors React                                                                  |
| Mascotte                              | Hors React                                                                  |
| DualTable                             | Boards uniquement                                                           |
| Conversation                          | Famille propre (largeur interne `max-w-2xl`)                                |
| Workspace                             | Famille propre                                                              |
| ActivityReader                        | Overlay lecteur : `max-w-3xl`, `rounded-t-xl`                               |
| Empty icon                            | Koboyo 160 (`size-40`), fill, pas de wash ; 32 in-table                     |
| Login coquille compacte               | Première surface : fenêtre calée sur la pile                                |
| Login marque Koboyo 64                | Première surface, `currentColor`, pas Lucide                                |

---

## 12. Règle de décision

Pour chaque problème UI :

1. Quelle est la page type ?
2. Quels patterns sont nécessaires ?
3. Quelle primitive existante doit être utilisée ?
4. Peut-on résoudre le problème sans nouvelle règle ?
5. Si non : **STOP** et vérifier si cette nouvelle règle mérite d’entrer dans ce document.

Ne jamais résoudre un problème par un override local simplement parce que c’est plus rapide.

---

## 13. The Pierre Visual Test

1. Cet écran est-il Apple Premium, ou seulement du shadcn propre ?
2. Fonctionnerait-il sans borders ?
3. Ai-je créé une Card alors qu’une surface suffirait ?
4. Ai-je utilisé une couleur uniquement pour la hiérarchie ?
5. Les contrôles sont-ils inutilement grands (`h-10`) ?
6. Y a-t-il plus d’un niveau de radius sans raison ?
7. Les infos importantes sont-elles hiérarchisées par la typo ?
8. L’écran est-il un outil, ou un dashboard SaaS ?
9. Puis-je supprimer 20 % du chrome sans perdre d’information ?
10. Plus d’un `Button` filled ?
11. Titre > `text-xl` hors Home ?
12. Ombre sur la page (hors tuiles d’accueil) ?
13. `App.tsx` connaît-il encore le padding de cette tab ?
14. Ce cas invente-t-il une règle locale au lieu d’utiliser un pattern ?
15. Cet Inspector est-il une page miniature (footer, KPI, DualTable, Document) ?

---

## Home — scène (exception)

L’accueil n’est pas un lanceur. C’est la porte. Paper autour, cluster centré (`max-w-[72rem]`), bloom radial `--home-bloom`.

**Composition.** Bento 4×4 plein cadre (`flex-1`, `p-2` `gap-2` partout). Radius 12 px. Pas de filet sur les cellules. **chat = héros** (`col-span-2 row-span-2`). Métiers, automatisations et contact par lots en tuiles 1×1. Synthèse, attributions et ventes en bandeau (`col-span-2`). Pas de footer. Pas de titre de page.

**Tuiles.** Pas le `Card` shadcn. Classe `.home-tile` + `.home-tile-n`. `rounded-2xl` (12 px). Héros : `p-6`, icône `size-32`, titre `2.25rem / 1.1`. Autres : `p-4`, icône `size-24`, titre `1.5rem / 1.15`. Titre seul. Motion `TILE_ENTER` **intacte**.

Palette : même matière, dix pigments. Ailleurs : interdit `bg-gradient-*` / `from-*` / `--home-*`.
