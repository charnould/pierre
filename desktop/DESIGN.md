# PIERRE — Design system

Apple Premium. Cubique dans l’outil. Accueil : métiers, travail personnel.

PIERRE n’est pas un dashboard SaaS. C’est un outil de travail intelligent. shadcn/ui est une collection de primitives techniques, pas une direction artistique. Si un écran est seulement _propre_, il n’est pas fini.

```
Tokens → Primitives (ui/* owned) → Patterns → Page types → Pages
```

**PAGE TYPE → PATTERNS → PRIMITIVES. Jamais l’inverse.**

Une page n’invente ni couleur, ni radius, ni hauteur de contrôle. Si ça manque : token, ou édition de la primitive. Jamais un wrapper. Jamais une variante de plus. Si un cas ne rentre pas dans ce contrat : s’arrêter et le signaler.

### Delta registre shadcn

`src/shared/components/ui/*` suit le registre shadcn `base-nova`. Après un `shadcn add --diff`,
la version du registre est la base ; aucun ancien fichier n’est restauré en bloc.

Le delta Pierre autorisé est limité à : light-only, contrôles `h-8` et chrome `h-7`, géométrie
Electron sous la TitleBar, Drawers Inspector/Activity, Empty Lucide 32, 16 in-table, sans wash, Field
12/16, avatars Inspector `xs`, labels accessibles des Sliders et DatePicker local
`YYYY-MM-DD`, et surfaces d’export limitées aux usages réels de l’application. Toute autre
divergence doit être justifiée dans ce document ou supprimée.

### Contrat nominal des primitives

Une feature peut positionner une primitive (`layout`) mais ne redéfinit pas son apparence. Couleur,
espacement interne, typographie, radius, bord, ombre et états visuels utilisent d’abord l’API
générique du registre. Un seul caller ne crée ni taille, ni variante, ni prop comportementale.

`Button` et `Badge` sont les primitives du formulaire structuré (`prototypes/plan-apurement`).
`Badge` n’a pas de taille dédiée ni de couleur de donnée. La palette des initiales d’avatar vit
uniquement en CSS ; TypeScript ne calcule que son index déterministe.

Les exceptions exactes de `config/shadcn-lint.jsonc` couvrent seulement une géométrie locale hors
échelle ou une dimension calculée à l’exécution. Elles autorisent la déclaration Tailwind ou
`style` au caller ; elles ne sont ni des tokens, ni un précédent pour étendre une primitive.

---

## 1. Philosophie

Loi : **cubique** dans l’outil. 90°. Une matière. Joints 1 px. Radius 8 px (`rounded-md`). Pas une scène. Pas une tuile.

Premium = réduction, cohérence, densité maîtrisée, absence de bruit. Pas luxe. Pas glass. Pas vitrine.

- Hiérarchie plutôt que décoration
- Whitespace plutôt que filets répétés
- Typographie plutôt que couleur
- Surfaces sémantiques plutôt que fonds arbitraires
- Cards pour un domaine, pas pour décorer
- Divulgation progressive plutôt que tout montrer
- Les contrôles disparaissent jusqu’au besoin

Hiérarchie, dans cet ordre : typographie → espacement → surface → densité → position → contraste. Ensuite seulement : filet, couleur, ombre.

---

## 2. Page types

Chaque vue React appartient à **exactement un** type. Les overlays ne sont pas des page types.

| Vue                | Type         |
| ------------------ | ------------ |
| Accueil            | Home         |
| Réclamations       | Board        |
| Impayés            | Board        |
| Automatisations    | Directory    |
| Contacter par lots | Directory    |
| Synthèse           | Split        |
| Paramètres         | Document     |
| Administration     | Document     |
| Login              | Login        |
| Assurances         | Placeholder  |
| Relocation         | Placeholder  |
| Attributions       | Placeholder  |
| Ventes             | Placeholder  |
| Discuter           | Conversation |

### Home

L’accueil ouvre les métiers et montre le travail personnel. On fait dans l’Inspector ou le board. Pas un Board, pas un Document. Pas de h1, pas de compagnon. Canvas : padding 16, contenu `max-w-7xl` centré, ancré en haut.

**Invite.** Deux paragraphes Geist Serif, tirés une fois à l’ouverture, jamais selon l’heure. La première ligne (`text-5xl` `leading-tight` medium) alterne des salutations sobres, des variantes nommant l’agent de Prestataires et, seulement si la personne l’a renseigné, son prénom d’usage. Pas de prénom déduit du login ou du nom d’affichage. La seconde ligne, remontée de 8, demande « Que souhaitez-vous faire {moment} ? » en `text-4xl` `leading-tight` medium. L’invite est à 24 au-dessus des grilles.

**Grille.** Métiers et personnel partagent une grille : 4 colonnes, gouttière 16, alignée en haut. Entre les deux grilles, la même gouttière 16. Pas de bascule `lg`.

**Métiers.** `nav` « Métiers ». `HomeDoor` : tuile au nombre d’or (`aspect-[1.618]`), padding horizontal 16, vertical 12. Icône 20, puis verbe Geist Sans 18/24 medium, puis bénéfice concret Geist Serif 14/19, 350, limité à trois lignes. S’il nomme l’agent, le texte reprend le nom de Prestataires. Même dégradé, seule la teinte change ; une encre sombre et des pigments pop. Le survol suit le pattern « Porte métier » de la section Animations.

**Personnel.** `section` « Travail personnel », quatre `Card` sur la même grille. La Card porte `gap-1 px-4 py-3` ; `CardHeader` et `CardContent` sont `px-0` pour conserver un seul inset. Première ligne : icône du rail 20, trait 1.5, et « Tout voir » outline `h-7` avec un nom accessible spécifique. Puis `CardTitle` et le contenu. Une carte vide garde le nombre d’or ; une carte remplie suit son contenu, alignée en haut, sans étirer la rangée. Ordre : Notifications, Tâches, Tâches assignées, Activités. Les contenus réutilisent le **Work feed** et N vient des settings (2–20, défaut 10). Le vide est une seule `EmptyDescription` `sm`, sans second titre ni icône.

### Board

Réclamations et Impayés uniquement. Flush. DualTable protégé. Toolbar compacte. Header sticky. Lignes ~32 px. Rubrique, thead et lignes = `bg-background`. Pas de Card shell. Pas de h1 de page. Pas de KPI cards. Pas de pagination écran.

**Ne pas étendre DualTable** à Automatisations ou à d’autres collections.

### Split

Synthèse. Configuration → résultat. `Resizable`. Formulaire | output. Footer d’action `border-t`. Une primaire. Ce n’est pas un Chat.

### Document

Paramètres, Administration et le paramétrage. Login n’en est pas.

### Formulaire structuré

Contrat des pages de saisie denses : plan d’apurement, diagnostic, protocole, préférences, paramétrage. Il remplace toute phrase contradictoire de ce document.

Une page Document ouvre par le même `h1`, le nom de l’écran, sans sous-titre : `font-serif text-4xl leading-tight font-normal`. Geist Serif Regular. `font-heading` reste le sans des titres d’interface. Le titre défile avec le formulaire. Un formulaire niché dans un Board ou un Inspector ne devient pas une page. Une section égale un domaine, rendu par une Card plate (`card`, filet, radius `md`, sans ombre). `CardTitle` nomme le domaine (18/24, medium), pas la page. Pas de seconde Card imbriquée : `FieldSet`, `FieldGroup`, `Separator` ou Table.

Canvas : `bg-background`. Le padding vit sur le défilement, `px-4 py-8` : 16 sur les côtés, 32 en haut et en bas. La colonne est `mx-auto w-full max-w-5xl`, sans padding. Les sections restent espacées de 16 px. Défilement vertical, footer compris.

Rangée de champ, dès `md` : lecture `minmax(16rem, 1fr)`, contrôle 24 rem, gouttière 24 px. Aide de champ en Geist Serif 14/19, poids 350, `text-balance`, `text-muted-foreground`. Les détails conditionnels n’existent que lorsque leur condition est active. Les collections s’éditent dans leur table : ajout après le tableau, retrait par icône, au moins une ligne quand le métier l’exige.

Table de ce formulaire : 14/20, en-tête 12/16 semibold. Nombres en `tabular-nums`. STIX seulement dans une formule MathML.

Footer dans le flux, pas sticky : à gauche enregistrer et l’état `aria-live`, à droite les secondaires `outline` puis une seule primaire. Une action destructive n’emprunte pas le primaire.

Focus des contrôles : filet `ring` et anneau 2 px à 20 %. Pression du bouton : translation de 1 px, pas de scale. Couleurs uniquement par rôle : stone et bleu, `control` pour le fond des contrôles, `destructive` pour l’erreur. `warning` seulement s’il est déjà porté par `Badge`.

Hors de cette famille, Board, Directory, Inspector, Conversation, Home et le chrome Electron gardent leur agencement. Ils utilisent les mêmes tokens. Les pigments d’accueil n’en font pas partie : ils n’entrent pas dans cette famille.

### Directory

Automatisations et Contacter par lots. Collection d’objets — ni Board ni Document. Flush. **Une rubrique par onglet** — même chrome que DualTable : `bg-background`, titre Geist Sans `text-xl` + · + compte, CTA outline + une primaire. **Interdit :** fusionner les buckets. Liste paper (`DirectoryList`). Lignes **identité empilée** (nom + description, 2 lignes max) + **métadonnées en colonnes alignées à gauche** (`text-start` partout, y compris actions). Séparateur `border-border/60` **ou** whitespace, jamais les deux. Hover / selected = `bg-muted`. Recherche `InputGroup`. Automatisations : formulaire = Dialog `max-w-2xl`. Contacter par lots : éditeur **plein cadre**, corps centré `max-w-4xl px-6` (requête / résultats / envoi), pas de Dialog de formulaire. Historique d’un traitement = pile de rubriques flush (même chrome DualTable : Geist Sans `text-xl` + · + méta), table Geist Sans 13 / thead 11, un scroll, pas DualTable, pas Document ; clic ligne = même Inspector Impayés. Le corps **peut** grouper les champs par `FieldSet` + `FieldLegend` (16/24). Pas de Card comme shell. Pas de filet « un bloc = un paramètre » (Document). Pas de DualTable.

### Administration

Ordre de l’index : trois cartes titrées Accès et suivi, Prestataires, Modules. Accès et suivi : Utilisateurs, Encyclopédie, Conversations, Statistiques. Prestataires : Prestataires. Modules : Chatbot, Réclamations, Impayés, Synthèses, Générer un rapport. Le h1 nomme l’écran, sans sous-titre. Trois niveaux, les mêmes que Prestataires : page en Geist Serif 36 regular, domaine en `CardTitle` 18/24, ligne en nom sans 14/20 et description serif 14/19. Chaque carte a un `CardTitle` de domaine. Les portes sont un `FieldGroup` `rows` : filet `border-border/60` entre les rangs, sans gap. Le nom de la porte est un `FieldLabel`, sa phrase une `FieldDescription`. La ligne entière n’est pas le clic. À droite, un `Button` `outline` : `Gérer` pour Utilisateurs et Encyclopédie, `Consulter` pour Conversations et Statistiques, `Paramétrer` pour Prestataires et les cinq modules. Le nom accessible inclut la destination. Pour ces cinq modules seulement, une fois l’état serveur lu : `CircleCheck` et `Paramétré`, ou `Circle` et `À paramétrer`. Icône encre 16, trait 1.5, méta 12 muted, devant le bouton. Avant la lecture, rien. Pas de Badge, pas de couleur d’état, pas de compte, pas d’animation.

`Retour` est un `Button` `outline` `icon-sm`, nom accessible « Retour ». Le filet et le fond sont ceux d’`outline` (`border-border`, `bg-control`) : le même contrôle secondaire que le reste de l’outil, pas un ghost, pas un primaire. Pas de taille nouvelle, pas de variante nouvelle, pas de `className` sur le bouton. Sur une page à `h1`, il est sur la même ligne et défile avec le titre. Sur une liste, il est à gauche du titre d’en-tête, qui ne défile pas. Pas de bandeau. Depuis le détail d’une conversation, il revient d’abord à la liste. Le plan d’apurement le garde en premier élément de la colonne. L’index Administration et Paramètres, session ouverte, ramènent à l’accueil. La connexion n’en a pas. Les Boards n’en ont pas. Utilisateurs, Encyclopédie et Conversations restent des listes. Leur titre de rubrique a la taille du `CardTitle`, le compte est muted 14, et la seconde ligne d’identité est une `FieldDescription`. Le chrome Directory `text-xl` ne s’y applique pas. Les colonnes de méta restent en 12. Le détail d’une conversation est un Document : Cards Contexte et Qualification, fil read-only centré `max-w-3xl`, sans composer. Statistiques est un Document à deux Cards, Consommation puis Journal des traitements. Les deux graphiques de Consommation sont la seule surface `chart` : encre, méta et filet existants, au plus deux séries, `prefers-reduced-motion` respecté. Prestataires : cartes Organisme, Intelligence artificielle (LLM), RCS, Email, Courrier (via La Poste), Signature électronique (via La Poste). Courrier configure Maileva : environnement détecté depuis l’utilisateur, identifiants, adresse expéditeur et clé TOTP. Signature électronique indique seulement « Intégration en cours ». La carte Email comprend le canal, le logo, puis le gabarit. Le gabarit est la même exception que le fichier d’interface : `Field` vertical, `Textarea` pleine largeur, `max-h-96`. Chaque carte active a son `Enregistrer` à gauche et son état `aria-live`. Signature électronique n’en a pas. Pas de carte Avancement.

Chatbot, Réclamations, Impayés, Synthèses et Générer un rapport : la première Card est Avancement. JSON et consigne reprennent l’exception du gabarit.
`CardAction` porte `{faites} sur {total}`, `tabular-nums`, méta 12 muted. Une ligne par pièce,
ordre stable, le même que les cartes qui suivent. Nom fixe : Configuration, Consigne, Icône,
Courrier, `Modèle {fichier}`. `CircleCheck` si la pièce est enregistrée, `Circle` sinon, encre,
16 px, trait 1.5. Pas de Badge, pas de bouton. Le nom accessible est « {nom}, enregistrée »,
« {nom}, enregistré » ou « {nom}, à faire ». Un champ vide ou blanc ne compte pas.

Utilisateurs est l’exception à deux rubriques : `Profils` puis `Utilisateurs`, sans fusion.
Chaque rubrique a son chrome Directory (titre · compte, CTA). Créer / éditer un profil =
Dialog `max-w-2xl` (nom, modules, chatbots). Le dialog utilisateur assigne un profil ou
`Personnalisé` ; les cases modules / chatbots sont `disabled` si un profil est choisi.
Administrateur reste hors profil. Libellé **Chatbots**. Identité profil = Avatar + `IdCard` +
nom. Les lignes utilisateurs portent une checkbox ; dès qu’une case est cochée, un CTA outline
**Affecter un profil** ouvre le menu des profils. Pas de tout sélectionner.

Encyclopédie est l’exception Directory à deux buckets : `Core Data HLM` puis `Autres sources`,
sans fusion. Core Data affiche toujours le catalogue théorique complet, y compris les tables
absentes ; ses identités sont les cinq noms réservés `core.*.csv` (L1) et le label métier (L2).
Autres sources réunit toutes les entrées CSV/DOCX/Markdown/Excel non Core Data, affectées ou non.
Une ligne représente un fichier CSV/DOCX/Markdown ou un onglet Excel. Autres sources : L1 = titre
encyclopédie tel quel (14 medium), L2 = nom de fichier uploadé avec extension. Les profils ne
vivent pas dans l’identité. Icône à gauche alignée sur L1 (`h-5` / `size-4`) : `Table2` pour
CSV/Excel, `FileText` pour DOCX/MD ; sa couleur reprend l’état (`muted` / `primary` si OK /
`destructive` si KO). Une seule toolbar globale porte recherche, statut de reconstruction et
actions. Les lignes partagent quatre colonnes : identité, Badge d’état + comptes d’affectation,
dernière modification, actions. Tous les états (Absent, Non affecté, À construire, En cours, OK, KO)
sont des `Badge` existants ; les affectations s’affichent en méta 12 muted (`2 profils` · `1 module`).
Le détail des noms s’ouvre au survol dans un Popover existant (blocs Profils puis Modules, titres 14
medium, listes 12). Les actions icône ont un Tooltip. `Non affecté` n’est jamais
une rubrique. Affectation = profils (chatbots / skills) et modules desktop, listes indépendantes.
Vide des deux = non affecté. Un module se publie vers ses skills existants. Désaffecter conserve la
ligne. Suppression fichier ou onglet depuis la ligne
(`Trash2` + `ConfirmDialog`), jamais depuis le dialog. Le titre d’une source ordinaire est le nom
de fichier ou d’onglet, overridable ; le vider restaure ce titre officiel. Une ligne d’aide montre
le `snake_case` agent. Un titre Core
est le stem sans `core.` et n’est pas éditable. Le dialog n’a ni URL, ni preview, ni supprimer,
ni ligne d’en-têtes : Excel est refusé si les noms de colonnes ne sont pas sur la première ligne.
Pas de téléchargement : l’original n’est pas conservé, seul l’import canonique l’est.
`Reconstructions` n’a ni CTA ni Dialog ; le polling du dernier build suffit.
L’UI configure : upload, affectation et suppression ne publient qu’au clic sur `Reconstruire`.
La CLI livre : un fichier affecté dont les octets changent déclenche la publication. Tant que le
catalogue diffère du dernier build réussi, la toolbar rappelle de reconstruire et les lignes
affectées sont `À construire`. Pendant un build global, elles sont `En cours` et le bouton est
disabled. Aucun overlay global : l’encyclopédie précédente reste publiée jusqu’au swap atomique.

### Conversation

Deux empty states, un `ChatPanel`. Rien qui n’est pas un message n’entre dans le fil.

Page Discuter, quick chat et public : un `ChatPanel` par surface. Public prend greeting, exemples et disclaimer depuis
la config (`greetings` / `examples` / `disclaimer`). La page Discuter et le quick chat prennent le greeting mais
n’affichent jamais exemples ni disclaimer. Absents ou vides : rien. Greeting serif, une
salutation tirée au hasard — pas une question (l’invitation est le placeholder du composer).
Public (`arrival` depuis ChatWebApp) : greeting `text-4xl` / 450 (embed : `text-2xl`).
Discuter : greeting `text-2xl` / 450. Emoji de config conservé. Exemples : liste filetée
`rounded-xl` `divide-y`, Geist Sans 14, des deux côtés. Clic = envoi. Survol ou focus d’un
exemple : le placeholder du composer reprend le texte (pas le draft). Encre alignée (`px-3`).
Tant qu’il n’y a pas de message, l’invitation publique (greeting + composer + exemples) ou desktop
(greeting + composer) est centrée dans le canvas — deux spacers `flex-1`. Au premier message,
greeting et éventuels exemples disparaissent, le composer se pinne en bas ; sur public uniquement,
le disclaimer (s’il existe) apparaît alors sous le composer, 10/16 muted centré (`mt-2`). Pas de
disclaimer à l’empty. Scroll fenêtre sur `/` (pas de
MessageScroller). Scroll interne sur `/embed` et Discuter. Chrome public : `public-chrome.css`
(papier blanc `1 0 0`, encre `0.20` H 260 chroma faible), bundle chat-web seulement. Discuter :
`globals.css` stone.
`data-chat-chrome` libelle le document (`public`) ou le panneau (`desktop`) ; ce n’est pas un
sélecteur. ChatPanel ne porte aucune couleur.
Pas d’icône dans le fil. Web : filet au focus du composer, pas de halo. Discuter : anneau
du formulaire structuré. Curseur dans le champ sur `/` et Discuter, pas sur `/embed`.

Fil, empty et dock partagent `max-w-3xl px-6`. User bubble `muted` Geist Sans 14/20, assistant sans
bulle. Anatomie : message → travail de l’agent → réponse → état. Raisonnement et outils sont une
preuve secondaire. Le Questionnaire prend la priorité dans le dock sans recouvrir le fil.

Réponses assistant (`typeset-reply`) : Geist Serif, 16/23, graisse 450, optical size, tracking 0,
flow 14. Listes : 0.5em, marqueurs encre, `ol` tabular-nums. Greeting empty : même voix, `px-3`,
salutation issue de `greetings[]`. Public : `text-4xl` / 450 (embed : `text-2xl`). Discuter :
`text-2xl` / 450. Chrome, exemples,
bulle user, composer et traces : Geist Sans `text-xs`. Sortie d’outil : `CodeBlock` mono. Exemples : liste
filetée Geist Sans 14, pas de pastille. Méta
12/16.

### Login

Exception de **coquille**, pas de pattern. Petite fenêtre centrée, non resizable, taille non persistée (`LOGIN_WINDOW_BOUNDS`, 400×543). TitleBar native, pas de sidebar. Paper `bg-background`. Pas de Card, pas d’ombre, pas de gradient.

Pile intrinsèque (pas `flex-1`). `px-6 py-6`. Rythme 16 (`gap-4`).

Titre : `h1.sr-only` « Connexion ». Marque : `ServerNas` × `MailCheck` × `KeyRound` × `SquareCheck` = `LockKeyholeOpen` × `ShieldCheck`, encre, 32 px (`size-8`, trait 1.5), sur la largeur des champs, `aria-hidden`. Les signes `×` et `=` sont du texte, même écart partout.

Champs : `FieldLabel` → `Input` `h-8` → `FieldError` sous **ce** champ. Pas de `FieldDescription` sur serveur / email / mot de passe (placeholders = exemples). Pas de slot d’erreur réservé.

| Champ        | Erreurs                                     |
| ------------ | ------------------------------------------- |
| Serveur      | URL invalide, réseau, API, cookie, 500      |
| Email        | vide                                        |
| Mot de passe | vide, `invalid_credentials`, `rate_limited` |
| Acceptations | la case ; `FieldError` sous le **bloc**     |

Acceptations : une `Checkbox` + `FieldContent` (`FieldLabel` titre, deux `FieldDescription` serif **12/16**, poids 350). Le 14/19 d’aide de champ ne tient pas dans la coquille. Interdit : `FieldLabel` restylé en `text-xs`.

Une primaire intrinsèque (`w-fit`, pas `w-full`). Jamais `disabled` pour le légal — seulement `loading`. `overflow-hidden` — jamais de scrollbar. Loading : `Spinner` dans le bouton.

Bounds = TitleBar + `px-6 py-6` + pile **au repos**. Un micro-saut 1–2 lignes `FieldError` est licite. Jamais un `max-w-2xl`.

### Placeholder

Assurances, Relocation, Attributions, Ventes. Uniquement Empty canonique. Pas de `p-8` / `text-lg` inventés. Pas d’illustration custom.

### Discuter

Plein canvas sous la TitleBar. Pas de padding de page : le `ChatPanel` desktop occupe la surface (`minimal`, greeting `text-2xl`, pas d’exemples ni de disclaimer). Pas de barre de déplacement, pas de resize, pas de fermeture. On quitte par Accueil ou Échap. Le quick chat est un overlay, pas cette page.

---

## 3. Application chrome

Le chrome global reste responsable **uniquement** du chrome global.

| Surface                                       | Règle                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TitleBar                                      | `h-8` `border-b` drag. Une grappe opposée aux contrôles natifs, composée de deux groupes séparés par 8 : Accueil · Tâches · Notifications · Discussion rapide, puis Paramètres · Admin si admin · Manuel. Contrôles `.no-drag`, actif ou ouvert = `bg-muted`, reste = drag. Gouttière 8 après le chrome natif ; Windows/Linux ajoutent `env(titlebar-area-*)` avant les captions. Aucun padding de canvas. |
| Canvas                                        | `App.tsx` **ne décide plus** du padding par tab. Le page type compose sa surface. Un seul composant responsable du padding d’une surface.                                                                                                                                                                                                                                                                  |
| Activity                                      | Drawer gauche 24 rem. Trigger = `Inbox` TitleBar. Non-lus = point `badgeColor` (pastille compagnon) `start-full`, pas de compte. Grammaire : Work feed.                                                                                                                                                                                                                                                    |
| Tâches                                        | Second drawer gauche 24 rem, exclusif d’Activity. Trigger = icône `SquareCheck` TitleBar + Tout voir des tâches. Grammaire : Work feed.                                                                                                                                                                                                                                                                    |
| Discuter                                      | Métier plein canvas sous la TitleBar. Trigger = porte Accueil. Pas de barre, de resize ni de fermeture : on quitte par Accueil ou Échap.                                                                                                                                                                                                                                                                   |
| Quick chat                                    | Fenêtre non modale, persistante pendant la session. Trigger = `MessageSquare` TitleBar, libellé « Discussion rapide ». Survole le canvas, les drawers et l’Inspector, y compris la page Discuter. Les Dialogs restent devant.                                                                                                                                                                              |
| Find-in-page                                  | Overlay flottant, `fixed`, `rounded-md`, `shadow-md`, `h-7`, `InputGroup`                                                                                                                                                                                                                                                                                                                                  |
| Reports HTML / application externe / mascotte | Hors arbre React. Ne pas les « shadcn-iser ».                                                                                                                                                                                                                                                                                                                                                              |

La fenêtre conserve les contrôles natifs et un titre visible vide. Drawers horizontaux et overlay
s’arrêtent sous `--titlebar-height` : feux macOS et captions Windows restent hors canvas.
Pas de sidebar : les métiers ne s’ouvrent que depuis l’accueil.

---

## 4. Overlays

| Niveau                  | Usage                           | Chrome                                                                                                                                                                   |
| ----------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Transient               | Tooltip / Menu / Popover        | `rounded-md` `shadow-sm`                                                                                                                                                 |
| Confirm / petit éditeur | `ConfirmDialog`                 | Dialog `max-w-md` `rounded-lg` `shadow-md`                                                                                                                               |
| Formulaire objet        | AutomationForm, etc.            | Dialog `max-w-2xl` `rounded-lg` `shadow-md`. Pas de Card interne.                                                                                                        |
| Inspector               | Dossier locataire / réclamation | Drawer 60 rem, 24 rem présent + 36 rem historique, paper, filet, `rounded-md`, `shadow-md`.                                                                              |
| Workspace               | Plan d’apurement                | Plein canvas. Ne pas le réduire en Drawer ni en Document.                                                                                                                |
| Inbox / suivi           | ActivityPanel                   | Drawer gauche 24 rem, `shadow-md`. Lecture : Work feed.                                                                                                                  |
| Tâches                  | TasksPanel                      | Drawer gauche 24 rem, `shadow-md`, exclusif d’Activity. Lecture : Work feed.                                                                                             |
| Quick chat              | ChatPanel                       | Fenêtre libre : 24 rem × 36 rem initial, minimum 20 rem × 20 rem, maximum = viewport sous la TitleBar. `rounded-xl`, filet 2 px `foreground/50`, `--shadow-chat-window`. |

La page Discuter et le quick chat ont chacun une instance de `ChatPanel` et un `convId` pendant la
session connectée. Ils ne partagent pas leur fil. Masquer, naviguer, déplacer ou redimensionner ne
remonte pas le fil de cette surface et ne libère pas sa VM. Les deux peuvent être visibles
ensemble : le quick chat flotte au-dessus de la page. La page n’a ni barre `h-7`, ni `X`, ni
resize.

Le quick chat : la barre interne `h-7` porte la poignée de déplacement et `X`, rien d’autre. Position initiale à
8 sous la TitleBar, côté grappe. Les quatre bords et quatre coins sont des zones de resize
invisibles avec curseur natif ; aucun glyphe, poignée ou état hover. Barre focusable : flèches =
déplacer, `Shift` + flèches = redimensionner, par pas de 16. Le cadre entier reste borné dans le
viewport ; position et taille restent en mémoire pendant la session. `X` ou le bouton TitleBar
masquent la fenêtre sans libérer la conversation. Dialog et Select restent devant ; toast au
sommet. Pas de titre, taille ou position persistée.

Inspector ≠ Inbox / suivi ≠ Workspace. Inbox à gauche (24 rem), dossier à droite
(60 rem). Frères : aucun effet nested de réduction ou d’assombrissement du parent.
Les deux drawers Pierre partagent `bg-background`, filet, `rounded-md`, `shadow-md`, inset 16 et
voile `bg-foreground/8` sans flou. Si l’Inspector est superposé à un drawer gauche, il est non modal :
le voile du drawer gauche reste l’unique voile.

Sheet : pas un pattern métier.

`window.confirm` est interdit. Utiliser `ConfirmDialog`.

---

## 5. Patterns

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
- Portée : formulaire structuré, éditeur Directory, Workspace. Pas Board, pas Inspector
- Placeholder ≠ description
- Ne pas utiliser `text-xs` à la place de `FieldDescription`
- Ne pas utiliser `text-xs` pour les labels, **sauf** Inspector compose (`InspectorComposeField`, 12 medium)
- Ne pas utiliser `text-sm` pour les descriptions
- `FieldDescription` : `text-balance` (toutes les descriptions de label)
- `Field` est la seule primitive de formulaire Directory / Workspace. Inspector compose = `InspectorComposeField`. Ne pas créer un troisième système.
- Instructions d’automation (rapport) : contrôle markdown Lexical dans le chrome Textarea (`rounded-lg border-input`, `min-h-78`) + toolbar `h-7` ghost `icon-sm`. Quand le parent borne la hauteur, la barre reste et le corps défile à l’intérieur du cadre. Contenu Geist Sans 14, pas `typeset`. Features : gras, italique, titres, listes, tableaux, citations, code. Persisté en markdown formaté, jamais en JSON Lexical.

### Identité collègue

Deux anatomies, pas une.

**Liste de sélection** (suggestions `@`, affectation gestionnaire, combobox collaborateurs, facettes Gestionnaire) : `OrgUserListItem` — avatar + nom (L1 : displayName custom, sinon login) + login (L2 muted `text-xs`). Toujours les deux lignes, même si le nom retombe sur le login. L2 = le login réel, pas la racine d’email, pas `@login`. Fichier : `src/shared/components/OrgUserListItem.tsx`.

**Chip / cellule / mention dans un texte** : avatar + nom (displayName org, sinon login), chip `Badge` `h-5` comme colorize — pas `@login`. Même anatomie dans le snapshot et l’événement d’assignation.

### ChoiceTile

Une primitive pour tous les choix tuilés.

Fichier : `src/shared/components/ChoiceTile.tsx`.

Anatomie : outline, `rounded-md`, titre 14 medium, caption 12 muted si utile, icône 16, selected = `bg-muted`, pas de ring coloré hors focus.

Aliases minces autorisés : `SettingsFieldOptionTile`, `AboutSubjectCards`, `AutomationTypeCards`, `AutomationReplyFormatCards`. Pas quatre systèmes visuels. L’accueil n’en est pas un : `HomeDoor` navigue, il ne sélectionne pas.

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
- Contrôles `sm` / chrome compact. Pas de padding Document

#### Header

Identité de l’objet + fermer. Rien d’autre.

- Titre objet = rôle encre (14 medium) s’il existe un nom humain
- Si l’objet **est** un identifiant, le titre tient sur **une seule ligne** : Impayés `id_client · id_locataire` ; Réclamations `id_reclamation` — Geist Sans 14 medium, `tabular-nums`, `truncate`, pas Geist Mono. Pas d’avatar générique ni de label décoratif. Pas de sous-ligne.
- Les IDs ne sont jamais le substitut d’un statut ou d’un CTA
- Close : ghost `icon-sm`, toujours, y compris `embedded` (ferme l’Inspector, pas Activity)
- Interdit dans le header : verbes métier, badges de phase, dette, filtres, toolbar d’icônes

#### Corps — le snapshot

Hors du rail. Pas d’acteur, pas de date, pas un événement.

Une seule surface paper (`rounded-md`, filet). Même ossature que « À faire » : ancre `size-4` (`Box` muted, `mt-0.5`, inerte) sur la même colonne que `Square` ; titre **Contexte** 14 medium. La grille méta commence 8 px sous le titre. Grille indentée : labels 12 muted, colonne `max-content`, valeurs 12 encre, chips compact `h-4`. Ligne **Tags** en dernier, masquée si aucun tag ; chips **inline** (`flex-wrap`), pas un chip par ligne. Pas d’icônes Lucide en tête de ligne méta. Pas de répétition des IDs du header. Pas de grille de KPI. Colorize = fill + encre + filet 1 px `color-mix(bg 72%, text)` (hex métier ou palette algo), **pas** de swatch / carré en tête, **pas** de `border-border` stone sur un fill hex. Identité collab chip = avatar + nom (displayName org, sinon login), compact `h-4` comme « À faire » — pas `@login`, pas `h-5` Board. Liste de sélection = `OrgUserListItem` (avatar + nom + login). Voir **Identité collègue**.

**Impayés** — la dette est la **première ligne méta** (label « Dette », montant · équivalent loyer `tabular-nums`, flèche de tendance dans la valeur). Ordre : Dette · Courriel · Téléphone · Référent · Groupe · Dernière action · Tags. Seuls les libellés du paramétrage Impayés s’affichent. Chips tags = une paire hex unique (`#E8E8E8` / `#333333`), pas de palette auto, pas de Coloriser DualTable. Pas de date de bail (colonne ledger).

**Réclamations** — même `Box` + titre Contexte. Pas de message dans le snapshot : le contenu vit dans l’historique (card courriel). Ordre : Locataire · Lot · Site · Reçue le · Canal · Qualification · État · État de la réclamation · Avancement · Panier · Référent · Tags. Lignes vides masquées. `etat_de_la_reclamation` et `avancement` = chips Colorize DualTable. Pas de répétition de `id_reclamation`.

#### Corps — à faire

Seconde surface paper, sous le snapshot, hors rail. Masquée s’il n’y a aucune action `a_faire`. Elle affiche uniquement le dernier snapshot ouvert de chaque tâche et constitue son unique surface live. Chaque rang : ancre `Square` muted `size-4` `mt-1` (clic = réaliser), centrée sur le titre 16/24 ; EyeOff `size-4` (ignorer, même boîte que l’ancre) ; Pencil `size-4` pour éditer/réassigner si autorisé ; Trash2 `size-4` pour supprimer si créateur ; libellé entier 16/24 medium (`whitespace-pre-wrap`, pas de truncate) ; puis méta 14/20 — échéance `DD/MM/YYYY`, assigné, créateur (labels et valeurs muted), note optionnelle (label muted, corps `text-foreground`) — chips `h-4` alignés (grille, colonne labels `max-content`) ; icônes de valeur (Calendar, avatars) sur le même axe (`ps-px`, pas `px-1.5` sur le badge date). La note, si elle existe, vient après Créé par et wrappe (`RepaymentMentionText`, `items-start`). EyeOff, Pencil et Trash2 `text-muted-foreground` (même cran, pas `destructive`). Tooltip au-dessus de chaque icône : Ignorer / Modifier / Supprimer. Édition = swap statique du rang entier ; le formulaire remplace immédiatement la lecture et n’affiche ni ancre Square ni intitulé. Formulaire : Assigné à (trigger `OrgUserListItem` outline + Popover portail, pas une liste inline) · Échéance (`DatePicker` compact `h-7`) · Note (`RepaymentMentionTextarea`) · Annuler / Enregistrer. Tout le monde peut réaliser ou ignorer (motif optionnel). Chaque création, modification, réalisation, ignorance ou réouverture produit en parallèle une entrée distincte dans la timeline.

#### Corps — le présent

Colonne gauche, sous snapshot / à faire. Pas un événement : pas d’avatar, pas de date, pas de « peut agir ». Pile de verbes outline en grille intrinsèque : tous les rangs prennent la largeur du plus long libellé, jamais toute la pane, avec `gap-1`. Filet `border-border/60`, hover `bg-muted`. Bord gauche = cards (padding du pane), icônes CTA sur la **même colonne** que Contexte / À faire (`size-4`, inset `px-3`), `text-muted-foreground` comme `Box` / `Square`, centrées avec le label (`items-center`), pas le rail historique. Le brouillon **remplace** la pile. L’acteur n’apparaît qu’à droite, après envoi.

**Composer** — une seule surface, rendue par `InspectorComposeShell` (jamais par le formulaire métier). Au repos : la pile. Actif : la pile disparaît, le shell la remplace. `rounded-md border-border/60 shadow-none ring-0` — plus discret que Contexte / À faire (`border-border`). En-tête : icône 16 muted + titre 14 medium reprenant le CTA. Labels visibles `InspectorComposeField` 12 medium ; contrôles 14 ; principaux `h-8`, DatePicker / actions compactes `h-7`. Espacements 8 intra-groupe, 16 entre groupes. Footer : `Annuler` outline + **une** primaire sémantique (`Ajouter` · `Planifier` · `Consigner` · `Enregistrer` · `Affecter` · `Envoyer`). Placeholders = exemples, jamais le seul label. Date = `DatePicker` partagé, valeur `YYYY-MM-DD` **locale** (pas `toISOString()`). Collaborateur = popover portail (`CollaboratorPopoverPicker`), pas Command inline. `prefers-reduced-motion` = swap immédiat.

États : `idle` (saisie) · `submitting` (champs et actions disabled, `aria-busy`) · `success` (reset + pile) · `error` (toast existant, brouillon intact). Reset **uniquement** si la soumission renvoie `true`. Annuler = reset volontaire, pas d’appel réseau. Focus : premier champ à l’ouverture ; CTA déclencheur après Annuler / succès.

**Impayés** — pile verticale `w-fit`, outline, icône 16 + label 14 medium, un rang = un métier. Ordre et libellés : `Laisser une note` · `Créer une tâche` · `Consigner une action réalisée` · `Contacter un tiers` · un rang Plan d’état (`Créer un plan d’apurement` / `Modifier le plan d’apurement` / `Clôturer le plan d’apurement`) · `Importer un email` · `Changer le groupe` · `Changer les tags` · `Affecter à un référent` ou `Réaffecter à un référent`. Pas de liste d’actes dans la pile. Tâche = Action (requis) · Qui (défaut = utilisateur courant) · Quand (défaut = aujourd’hui ; une échéance aujourd’hui est licite) · Note optionnelle · primaire `Planifier`. Action déjà réalisée = Action (requis) · Note optionnelle · primaire `Consigner`. `Contacter un tiers` = menu groupé par `group` (ordre `template_groups` ou alpha `fr`) ; `channel: rcs` = revue inline Téléphone (destinataire de cet envoi, prérempli une fois depuis le dossier, indépendant du modèle, non écrit sur le locataire) · Message RCS · Actions proposées (Réponse, Appel, Lien `https:`) · SMS de secours ; Envoyer si le composeur est prêt ; tentative RCS puis SMS de secours côté serveur au même numéro, sans sélecteur SMS ; `channel: email` = revue inline Objet + Message puis information de canal non configuré, brouillon conservé ; `channel: mailto` = client mail puis `ConfirmDialog`. `Importer un email` = sélecteur `.eml` uniquement, parse immédiat, pas de preview, pas de drag-and-drop, pas de Dialog. Plan = un verbe exclusif qui **quitte** vers Workspace (Clôturer = canvas read-only, motif inchangé). Groupe, tags et référent = brouillons dans le même shell.

**Réclamations** — même pile, même shell, mêmes labels 12 / contrôles 14. Ordre : `Répondre au locataire` · `Générer un point de situation` · `Ajouter une note` · `Créer une tâche` · `Consigner une action réalisée` · `Changer de panier` · `Importer un email` · `Changer les tags` · `Affecter à un référent`. `Répondre au locataire` ouvre un composeur unique : Format (`name` de l’application configurée si sa configuration est complète · `SMS / RCS` · `Courriel` · `Via la poste`) → Objet sauf SMS / RCS et format externe → Message. Le format externe, toujours courriel-like, est sélectionné par défaut lorsqu’il est disponible, sinon le courriel. Le champ Message occupe toute la hauteur restante du présent, avec un minimum éditable ; pendant la génération, il utilise exactement `AgentWorkTrace` + `GeneratedMarkdown` comme le module Synthèse, puis redevient une textarea éditable. Footer : `Rédiger avec {agent configuré}` · `Exporter en DOCX` pour le postal · `Annuler` · une seule primaire filled : `name` pour le format externe, `Envoyer` pour les formats directs. L’application externe est configurée par module (`name`, `transport`, `clipboard`, `url`, `selector`) : `browser` ouvre une fenêtre Electron modale, `external` ouvre la cible via le système. La confirmation « Avez-vous envoyé cette réponse ? » journalise ou non la réponse au locataire, même sans coordonnée connue, sans perdre le brouillon.

Pas de `DrawerFooter`. Pas de nested drawer. Dialog : `ConfirmDialog` (irréversible, « e-mail envoyé ? »). Un travail canvas (plan d’apurement) **quitte** l’Inspector vers Workspace. Pas une primaire de page permanente.

#### Corps — l’historique

Rail 1 px `border-border/60` et avatar d’acteur **uniquement à droite** :

**Acteurs.** Nœud `size-8` (`Avatar` défaut), bord gauche sur la colonne des cards — pas le 40 Activity. Collègue = kit avatar. Pierre (`agent` / `automation` / `system`) = compagnon en **cercle** (couleur settings, visage, sans pastille) ; la silhouette bureau (galet, goutte…) ne s’y copie pas. Fait système = glyphe registre (`BookMarked`) sur fond `muted`. Pas Lucide `Bot` / `Database`.

La lecture est celle de la frise du **Work feed** : date et contexte 14/20, acteur et verbe 16/24, corps 16/24. Le formatter Inspector reste `JJ/MM/AAAA · HHhMM`, jamais relatif. Le rail de l’Inspector garde `px-3` : son avatar reste calé sur l’ancre des cards. L’extrait Activités de l’accueil est affleuré. Le drawer Activités passe `px-6` à la même frise.

Une ligne raconte une action. Aucun badge ou icône de type. Chips `h-4` seulement pour les valeurs métier. Une erreur colore uniquement sa valeur en `text-destructive`. Aucun JSON, HTML ou enum brut. Texte libre `text-pretty`. Paragraphes `gap-1`. Activity 24 rem = scan (texte libre coupé à 240). Inspector 36 rem = détail.

| Corps         | Usage                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Citation      | `<blockquote>` filet gauche `/60` `ps-2` `gap-1` `text-pretty`        |
| Objet         | `rounded-md border-border/60 border p-2`, titre 16 medium, méta 16/24 |
| Delta         | scalaire `avant → après` ; collection = grille Avant/Après            |
| Fait          | label muted, valeur encre, nombres `tabular-nums`                     |
| Communication | enveloppe actuelle ; canal une fois dans L2 ; dernier statut projeté  |

Le canal n’est jamais le `type`. Canaux : RCS, SMS, Courriel, courrier postal simple, LRAR, ERE, LRE. Prestataire (AR24, La Poste…) optionnel dans le corps, jamais dans L2. Signature ≠ canal : `document.sent_for_signature` puis une ligne par `document.signed` / refus / expiration. Envoi : « Alice a envoyé le plan d’apurement pour signature électronique » + Objet (document, signataires, canal, prestataire). Pas d’enveloppe Communication en doublon.

Actions **de l’événement** : elles n’entrent pas dans la pile du présent. `outline` `xs`. Répondre = toujours visible. Modifier / Supprimer = visibles au hover / focus-within. Boost = emoji dans un `outline` `xs`. Retrait d’une note = `note.withdrawn`. Suppression d’une tâche = `task.deleted`.

Une tâche est une phrase L2 (« a créé une tâche ») + Objet (titre, assigné, échéance). Le corps porte note / résultat / motif en Citation, et les `changes` d’un `task.updated` en Delta. Seul le dernier `task.completed` du thread peut proposer `Rouvrir la tâche`. L’ancre Square, l’ignorance et l’édition restent dans « À faire ».

Une communication est une phrase L2 : acteur + verbe + canal, puis `·` + action et/ou `Traitement de masse`. Ex. « Alice a envoyé un courriel · Contacter la CAF ». L1 = `date_creation` de l’événement d’ouverture. Les `communication.ok` / `failed` sont projetés dans la même enveloppe, jamais comme lignes autonomes.

Le corps est **la même enveloppe** pour tous les canaux (`TimelineCommunicationEnvelope`) :

```
Grille Inspector (`max-content` / `1fr`), typo 16/24.
Rail gauche = icônes Lucide muted `size-4` dans `h-6 w-6` (pas des labels
texte), calées sur la 1re ligne 16/24 : De `UserRound` · À `AtSign` ·
Envoyé le `Clock` · Objet `TextQuote` · Document `FileText` ·
Statut `CircleCheck` · Corps `AlignLeft` · Choix proposés `Reply`.
Libellé en `sr-only` + tooltip.
Exception : le snapshot Contexte reste sans icône en tête de méta.
De                 — expéditeur (`expediteur` ou auteur)
Objet / Document   — une ligne, `truncate`, `title` = entier
Statut             — avant le corps ; échec = `text-destructive` sur la valeur
Corps              — avant les choix ; reflow `\n\n` → pile `gap-1`
                     (pas de ligne vide) ; jusqu’à 240, coupe au paragraphe
                     puis au mot ; `text-pretty`. Inspector : chevron 1em ;
                     Activity : ellipse
Choix proposés     — après le corps ; pills `Badge` secondary compact
                     `h-4` en wrap, un `li` par bouton ; pas une phrase
                     `A · B`
```

Coordonnées en clair (courriel et téléphone). Le canal ne change ni le chrome ni la réduction : seule la longueur décide. Pas de Badge, pas de couleur de canal, pas d’exception « réception initiale ouverte », pas de CTA textuel. Import `.eml` : L2 « a importé un courriel » ; L1 = date d’upload. Pas de Dialog. Pas de drag-and-drop.

Une transition d’état (groupe, affectation, réaffectation, tags) est aussi une phrase L2 unique : « a déplacé le dossier du groupe … vers … », « a affecté le dossier à … », « a réaffecté le dossier de … à … », « a mis à jour les tags » + chips du snapshot (ou « Aucun tag »). Le corps ne reprend pas avant → après — seulement la note si elle existe, au registre du Work feed.

Statut courant (snapshot) et transition (historique) **coexistent**. Ni l’un ni l’autre ne remplace l’autre.

Chrono descendant. Ouverture = haut. Highlight depuis Activity = selected `bg-muted` statique sur **toute** la ligne (avatar compris, flush au padding du body), breathing vertical 8 px, sans radius et sans `px-*`. Scroll **de la colonne droite**. Timelines longues : un scroll, expansion progressive, pas de pagination écran, pas de « Afficher plus » comme chrome.

#### Densité

Chrome compact — celui du `h-7`, pas du Document. Padding interne = flush Board (16). Présent : pas de rail, même inset que les cards. Rail historique (colonne droite) : `px-3` + nœud `size-8` + `ms-10` (32 + 8), bord gauche = ancre cards 16. Un seul padding responsable. La lecture de l’historique est le Work feed, pas le 12 du snapshot.

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

Motion Inspector : le shell entre depuis la droite avec la primitive Drawer. Aucun second moteur
de motion sur le header ou le split. Tous les Inspectors utilisent
`DrawerContent variant="inspector"` ; pas d’override métier local.

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
- `h1`, `text-xl` comme titre de page dans le corps
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

Un Split qui produit du contenu généré conserve cette grammaire de configuration → résultat :

- Les pièces jointes complémentaires vivent dans un `Field` de la colonne formulaire. Dépôt ciblé
  sur son `InputGroup`, liste `Item` compacte et erreurs inline ; pas de composer, de Dropzone ou de
  voile plein canvas.
- Le résultat commence par une identité 14 medium et une méta 12 muted. Le travail de l’agent est
  une preuve secondaire, avec la même divulgation que Conversation : ouverte en `expanded`, fermée
  en `collapsed`, outils seuls en `tools`, rien en `none`.
- Le Markdown est rendu en `typeset` pendant et après le stream. Les nouveaux mots utilisent le
  reveal partagé et le caret ; le résultat reste immédiatement lisible avec
  `prefers-reduced-motion`.
- Loading = trace active + statut compact dans le dock existant. Pas de scène ambient, de Card de
  chargement ni de second chrome concurrent du résultat.

### Conversation

Composition `shadcn-ui/chatbot-template`, adaptée au desktop Pierre. La page Discuter et le quick
chat sont deux documents desktop, plus le public : un `ChatPanel` par surface.
`public-chrome.css` sur `/` et `/embed`, `globals.css` stone sur les deux surfaces Discuter. Fil, empty public et
dock partagent `max-w-3xl px-6`. Rythme fermé : 24 entre tours, 16 entre travail et réponse, 8 à
l’intérieur d’un bloc. Le sélecteur de profil est le seul raccord visuel Pierre, en
`inline-start` de la ligne de saisie.

Dès l’envoi, la ligne assistant affiche Réflexion + spinner dans le fil. Elle reste jusqu’au
premier contenu visible de la trace — pas de trou, pas de second indicateur dans le dock.

Le travail de l’agent regroupe chaque suite contiguë de raisonnement et d’outils dans une seule
divulgation. `trace` a quatre modes : `none` ne montre rien une fois le contenu arrivé ; `tools`
montre seulement les outils ; `collapsed` reste fermée ; `expanded` reste ouverte, y compris après
la fin du tour. Une fois terminé, son résumé porte durée et nombre d’outils. Les détails sont
chronologiques : résumé, ligne d’outil et raisonnement en Geist Sans `text-xs`. Icône Lucide dans
`TraceIcon`. La ligne d’outil ouvre la sortie. `CodeBlock` `sm`, sans titre, copier au survol,
mono, `whitespace-pre`, pas de wrap, pas de coloration. Fermé tant que la ligne n’est pas ouverte,
y compris pendant le stream. Les réponses `ask_user` restent inline. Erreur ou interruption reste
visible sous une réponse partielle, sans seconde alerte.

Le dock public contient le Questionnaire prioritaire, puis le greeting empty, le composer, puis les
exemples (liste filetée). Discuter s’arrête au composer : jamais d’exemples ni de disclaimer.
Empty : l’invitation est centrée
(spacers `flex-1`), sans disclaimer. `/` :
`min-h-dvh`, scroll fenêtre si l’invitation dépasse. `/embed` et Discuter : le stage empty scrolle.
Au premier message, plus de spacers : fil + dock bas (fixe sur `/`) ; sur public, disclaimer sous
le composer s’il est configuré. Rythme empty : 16 entre greeting et composer sur public
(`arrival`), 8 sur Discuter, puis 16 jusqu’aux exemples publics. Encre
`px-3`. Placeholder du composer : invitation par défaut, encre à 50 % (`public-chrome.css` /
`globals.css`) ; au survol ou focus d’un exemple, le placeholder devient cet exemple (65 %), le
draft ne change pas, le clic envoie. La bulle utilisateur et le Questionnaire gardent `rounded-xl`.
Le composer web aussi : `rounded-xl`, `shadow-sm`, barre `h-10`, focus filet sans anneau, dépôt `ring-1`,
papier blanc. Le composer de Discuter reprend le contrôle du formulaire structuré : `rounded-md`,
`bg-control`, sans ombre, barre à hauteur de contrôle, focus et dépôt sur l'anneau `ring-2` à 20 %.
Composer : colonne. Texte 3 lignes, `block` `text-start` (pas `flex` : le placeholder Chromium se centre).
Profil à gauche, trombone / envoyer à droite.

Le dépôt de pièces jointes cible tout le canvas mais désigne le composer : `dropActive` = ring du
`InputGroup`, pas de voile plein écran. Le survol reste neutre car Electron ne garantit pas
l’extension avant le drop. Trombone (`input type="file"`) si `attachments`. Après validation, les
fichiers sont des `Attachment` `sm` (nom, méta extension · taille, miniature image éventuelle),
`FieldError` inline et retrait sur la pastille. Aucun Dropzone, Card, Dialog, dashed ou
toast. `dragover` ne déclenche aucun rendu ; les octets ne sont lus qu’à l’envoi. Dans le fil, les
mêmes chips sont read-only sous la bulle utilisateur.

Pendant le stream, les nouveaux mots reprennent le reveal partagé (opacity + translate, 200 ms,
stagger 40 ms, backlog borné à 24 mots) et le dernier bloc textuel porte un caret `▋`. Outils et
questionnaire ne sont jamais différés. `prefers-reduced-motion` supprime le reveal et le blink.

### Contenu généré

Tout Markdown généré converti en HTML utilise `typeset` (`src/typeset.css`). Ne pas recréer un
rythme de prose avec des variants locaux et ne pas ajouter `@tailwindcss/typography`. Utiliser
`not-typeset` pour exclure un sous-arbre et `.typeset-scroll` autour des tables GFM larges.
Discuter utilise `react-markdown` + `remark-gfm` dans `typeset`, sans Streamdown.
Le renderer partagé de contenu généré porte également ce reveal et le caret
`.generated-stream-caret` ; ces comportements ne sont pas propres au type Conversation.

### Workspace

Plan d’apurement. Plein canvas. Formulaire structuré. Une primaire. Secondaires outline.

### Charts

La tendance de dette du tiroir Impayés est une flèche Lucide (`MoveUpRight` / `MoveDownRight` /
`Minus`) dans une boîte `size-4` `rounded-md` `bg-muted`. Pas de
fill saturé. Les rapports HTML restent hors React et utilisent ECharts.

### Work feed

Une seule lecture pour les notifications de l’accueil et du tiroir, pour les tâches, et pour l’historique Inspector. Pas de seconde voix selon l’endroit.

Inset horizontal 24 (`px-6`) dans les drawers, une seule couche, autour de la pile. Sur l’accueil, la carte a déjà l’inset de la tuile : les cadres y sont affleurés. Survol `bg-muted` sur tout le cadre de notification ou de tâche. La frise d’activités n’a pas de cadre ni de hover.

```
Notification — ActivityNotificationRow, accueil et tiroir
  cadre rounded-md, filet border-border/80, écart 8 entre cadres
  intérieur 12 horizontal, 8 vertical
  contexte non lu 14/16 medium, encre, collé à la provenance
  contexte lu 14/16 medium, muted
  provenance 12/16 muted, Geist Sans, tabular-nums : HHhMM · JJ/MM/AAAA · auteur
  message serif 14/19, poids 350, muted, écart 4, deux lignes max (`line-clamp-2`)
  avatar 20 en bout de ligne, calé sur le contexte

Activité — ActivityTimelineList, même frise ContextTimeline
  avatar 32, gouttière 8
  date 14/20 muted, puis module · ref
  acteur 16/24 medium + verbe 16/24 regular
  corps 16/24, 8 px sous le verbe
  pas de cadre

Tâche — OpenActionRow, accueil et tiroir Tâches
  même cadre que la notification
  Square 16, centré sur la première ligne
  titre 16/24 medium
  méta 14/20 muted
```

Sous-rubriques En retard / Prochaines : 14/20 medium. L’Inspector conserve le `px-3` de son rail. Le 12 reste au snapshot, aux formulaires compacts, aux badges, au chrome et aux tables.

Drawer Activity, 24 rem, sous la TitleBar, écart 16. Papier `bg-background`, filet, radius `md`, `shadow-md`. Voile `bg-foreground/8`, sans flou. `Tabs` default, sans override : `TabsList` `bg-border` en `flex-1` sur la ligne, icône du primitive + libellé (`Inbox` Notifications, `Activity` Activités), fermer `icon-sm` collé au bout. Les onglets inactifs utilisent `text-foreground/70`. Titre `sr-only` « Notifications et activités ». Pas de filet sous l’en-tête. En-tête `px-6 pt-4 pb-4`. Rangée d’actions `px-6 pb-4`, sans padding haut : l’en-tête a déjà posé les 16. Notifications : `Checkbox` « Afficher les notifications lues » + « Tout lu » outline s’il existe des non-lues ; Activités : « Suivre des collaborateurs · N » outline. Pas de compte dans l’onglet. Pages de 50. Non-lus = point `badgeColor` sur l’Inbox de la TitleBar. Lues : contexte muted, « Non lu » au survol dans une vraie colonne entre contenu et avatar, jamais en position absolue. Personne suivi : le corps est un `FieldSet`, `FieldLegend` « Qui suivre » et `FieldDescription` ; la rangée d’actions n’apparaît qu’ensuite. Empty et piles utilisent le même inset `px-6`. Clic → Inspector droit frère. L’inbox reste. Drawer Tâches : même chrome, onglets Mes tâches (`SquareCheck`) / Tâches assignées (`UserRound`), exclusif d’Activity.

Motion : la cloche ne sonne jamais en boucle. Une hausse du compteur déclenche un unique burst court ; ouvrir le centre ne le rejoue pas. Le shell entre avec la primitive Drawer. Le changement d’onglet est celui de `Tabs`. Chaque pattern porte son propre contrat `prefers-reduced-motion`.

### Empty / Loading / Error

**Empty** — primitive `Empty` pour une surface vide, sauf l’extrait d’accueil et l’historique Inspector (le présent suffit).

| Contexte                    | Titre                                              | Icône                             |
| --------------------------- | -------------------------------------------------- | --------------------------------- |
| Page / liste / drawer       | `EmptyTitle` 24/32 (`text-2xl`), description 16/24 | Lucide 32, trait 1.5, pas de wash |
| Accueil, extrait            | phrase `EmptyDescription` `sm`, serif 14/19, 350   | —                                 |
| In-table (bucket DualTable) | `className="text-sm leading-5 font-medium"`        | Lucide 16 (`EmptyMedia` `sm`)     |
| Inspector, historique vide  | _(pas d’Empty — le présent suffit)_                | —                                 |

CTA outline. Pas de dashed. Pas de nouvelle famille Empty.

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

Light only. Pas de `.dark`. Thème stone et bleu.

| Token              | Rôle                             | Tailwind                       |
| ------------------ | -------------------------------- | ------------------------------ |
| `background`       | page, card, popover, titlebar    | `bg-background`                |
| `foreground`       | encre                            | `text-foreground`              |
| `muted`            | hover, selected                  | `bg-muted`                     |
| `muted-foreground` | méta, descriptions, placeholders | `text-muted-foreground`        |
| `border`           | joints structurels               | `border-border`                |
| `input`            | contrôles                        | `border-input`                 |
| `primary`          | actions filled                   | `bg-primary`                   |
| `destructive`      | erreur                           | `text-destructive`, wash `/10` |
| `ring`             | focus only                       | `ring-2 ring-ring/20`          |
| `control`          | fond des contrôles               | `bg-control`                   |

**Interdit :** `gray-*`, `slate-*`, couleurs arbitraires de chrome, `bg-gradient-*` / `from-*`, couleur pour créer une hiérarchie.

### Pigments d’accueil

Réservés aux tuiles métiers, qui en sont intégralement couvertes. Ils identifient. Ils ne classent pas, ne colorent pas l’espace personnel, et ne sortent pas de l’accueil — en particulier pas d’un formulaire structuré. Valeurs dans `globals.css`. Une encre sombre (`home-ink`). Pigments pop, une clarté. Terre cuite, garance, indigo, paille, vert, azur, outremer et magenta portent la chroma ; vert de gris et céladon restent plus gris. Le dégradé est le même pour chaque métier : un pas plus clair et un peu moins chromatique vers le pigment, angle unique. Le départ reste coloré. Seule la teinte change. Pas d’utilitaire `from-*`. Un métier sans ligne retombe sur `muted` / `foreground`.

Survol : voile d’encre à 8 % par-dessus le dégradé. Pression : 14 %. L’encre conserve un contraste
AA avec chaque pigment dans ces trois états ; les pigments restent dans le gamut sRGB.

| Métier       | Sol                 | Sens                 |
| ------------ | ------------------- | -------------------- |
| chat         | `home-chat`         | voix, terre cuite    |
| tickets      | `home-tickets`      | réclamation, garance |
| repayment    | `home-repayment`    | compte, vert de gris |
| automations  | `home-automations`  | système, indigo      |
| bulk         | `home-bulk`         | courrier, paille     |
| about        | `home-about`        | synthèse, céladon    |
| insurance    | `home-insurance`    | assurance, magenta   |
| relocation   | `home-relocation`   | mouvement, vert      |
| attributions | `home-attributions` | demande, outremer    |
| ventes       | `home-ventes`       | cession, azur        |

### Typographie

Geist Sans + Geist Serif + Geist Mono + STIX Two Math. Geist Mono uniquement pour le littéral (JSON, code). Geist Sans pour l’interface, les valeurs, les tables, les actions, la frise et les tâches, avec `tabular-nums` sur les chiffres. Geist Serif pour le `h1` d’une page Document (36, regular), l’aide de champ (14/19, 350), toutes les `EmptyDescription` (16/24, 350 ; `sm` 14/19), le message d’une notification (14/19, 350), le sous-titre des portes métiers (14/19, 350, même voix que la description vide), et le corps des réponses de Conversation. STIX seulement dans une formule MathML. La question d’accueil est en Geist Serif, `font-serif`. Le reste de l’accueil est en Geist Sans. `font-heading` reste sans : cartes, dialogues, vides, portes.

Geist Serif v1 ne fournit que la graisse Regular 400 et aucun italique. Jusqu’à la publication de la famille complète, les demandes 350/450 se résolvent sur Regular et l’italique est synthétique. Cette limite est acceptée pour conserver une seule famille Geist sur toutes les surfaces.

| Rôle                    | Taille             | Poids                | Classe / primitive                                   |
| ----------------------- | ------------------ | -------------------- | ---------------------------------------------------- |
| Titre de page Document  | 36 / leading-tight | regular, Geist Serif | `h1` `font-serif text-4xl leading-tight font-normal` |
| Empty title             | 24/32              | medium               | `EmptyTitle` `text-2xl` ; `sm` 18/28 (`text-lg`)     |
| Empty description       | 16/24 Geist Serif  | 350, muted           | `EmptyDescription` `text-base`; `sm` 14/19           |
| Board section           | 20/24              | semibold             | rubrique Geist Sans `text-xl`                        |
| Form section            | 18/24              | medium               | `CardTitle`                                          |
| Corps de lecture        | 16/24 Geist Sans   | regular              | frise, tâches                                        |
| Message de notification | 14/19 Geist Serif  | 350, muted           | `ActivityNotificationRow`, deux lignes max           |
| Provenance notification | 12/16 Geist Sans   | regular muted        | `text-xs tabular-nums`, accueil et tiroir            |
| Encre / label / nom     | 15/20              | medium               | `FieldLabel`                                         |
| Valeur                  | 15/20              | regular              | body                                                 |
| Méta de feed            | 14/20 Geist Sans   | regular muted        | `text-sm leading-5`                                  |
| Aide de champ           | 14/19              | 350, Geist Serif     | `FieldDescription` (`text-balance`)                  |
| Erreur de champ         | 13/16              | regular destructive  | `FieldError`                                         |
| Table                   | 14/20 Geist Sans   | regular              | `text-table` + `tabular-nums`                        |
| Table header            | 12/16 Geist Sans   | semibold             | en-tête de table                                     |
| Méta dense              | 12/16              | regular muted        | snapshot, chrome, `text-xs`                          |
| Dette                   | 20/24 Geist Sans   | medium               | `text-xl font-medium tabular-nums`                   |

**Tables** : Geist Sans 14/20, `tabular-nums`. **En-têtes** : Geist Sans 12/16 semibold, muted. **Alignement** : `text-start` partout, y compris les montants. Geist Mono : JSON et code. Le plafond `max-h-[2lh]` de l’annuaire reste lié à `text-balance` ; la notification utilise `line-clamp-2`.

Hiérarchie par poids, contraste, position, taille — pas uniquement par couleur.

### Spacing

Échelle fermée de rythme de page : **4 / 8 / 16 / 24**.

Ne pas introduire comme rythme de page : 12, 20, 32, 48.

| Usage                                                   | Valeur                    |
| ------------------------------------------------------- | ------------------------- |
| Anatomie champ (label → desc → control)                 | 8 (`gap-2`)               |
| Entre champs                                            | 16 (`FieldGroup` `gap-4`) |
| Padding flush (Board, Split, Directory, Home, Document) | 16                        |
| Gouttière TitleBar                                      | 8 (`px-2`)                |

Ne pas empiler App + vue + enfant.

### Heights

| Surface                                                 | Hauteur                              |
| ------------------------------------------------------- | ------------------------------------ |
| Contrôles                                               | 32 (`h-8`)                           |
| Chrome compact / toolbar / table header / drawer chrome | 28 (`h-7`)                           |
| Lignes DualTable                                        | ~32                                  |
| Lignes Directory                                        | ~48–56                               |
| TitleBar                                                | 32                                   |
| Empty icon                                              | 32 ; 16 in-table (`EmptyMedia` `sm`) |
| Avatar Inspector cards (euro / checkbox)                | 16 (`xs`)                            |
| Avatar Inspector rail                                   | 32 (défaut)                          |
| Avatar Activity                                         | 32 (défaut)                          |

`h-7` uniquement dans les patterns nommés « sm » : toolbar / table / drawer / chrome.

### Widths

| Surface                                      | Largeur                          |
| -------------------------------------------- | -------------------------------- |
| Document (formulaire structuré)              | `max-w-5xl`                      |
| Home                                         | `max-w-7xl` centré               |
| Login                                        | coquille (`LOGIN_WINDOW_BOUNDS`) |
| Fenêtre connectée minimale                   | 1100 × 720                       |
| Confirm                                      | `max-w-md`                       |
| Form dialog                                  | `max-w-2xl`                      |
| Inspector                                    | 60 rem (24 rem + 36 rem)         |
| Inbox / suivi                                | 24 rem                           |
| Card bornée                                  | `max-w-sm`                       |
| Canvas Board, Directory, Split, Conversation | 100 %                            |

### Radius

| Contexte       | Token          | px  |
| -------------- | -------------- | --- |
| Contrôle, Card | `rounded-md`   | 8   |
| Petit contrôle | `rounded-sm`   | 6   |
| Overlay        | `rounded-lg`   | 10  |
| Grand overlay  | `rounded-xl`   | 12  |
| Badge / avatar | `rounded-full` | —   |

Interdit : une ombre sur le canvas ou une Card. `rounded-lg` et `rounded-xl` sont des overlays, pas le canvas.

### Borders / shadows

| Border                 | Usage                                                               |
| ---------------------- | ------------------------------------------------------------------- |
| `border-border`        | joints structurels, shell, split, footer, table                     |
| `border-input`         | contrôles                                                           |
| `border-border/60`     | lignes de liste **ou** whitespace — jamais les deux + grand padding |
| `border-foreground/50` | quick chat, 2 px                                                    |

| Shadow                 | Usage                                        |
| ---------------------- | -------------------------------------------- |
| aucune                 | page                                         |
| `shadow-sm`            | menu, tooltip, dock Conversation (composer)  |
| `shadow-md`            | dialog, drawer, find-in-page                 |
| `--shadow-chat-window` | quick chat : contact + élévation + diffusion |

### States

| État              | Traitement                                     |
| ----------------- | ---------------------------------------------- |
| Hover             | `bg-muted`. Porte métier : Pigments d’accueil. |
| Focus             | `ring-2 ring-ring/20`                          |
| Selected / active | `bg-muted`                                     |
| Disabled          | `opacity-50`                                   |
| Invalid           | `border-destructive` + ring `/20`              |
| Destructive       | texte + wash `/10`, pas de pavé rouge          |
| Active press      | translation de 1 px                            |

### Icons

Lucide partout (canvas / nav : 16. Porte métier : 20. Chrome sm : 14. Empty : 32, in-table 16. Trait 1.5). Cloche Notifications : stroke only. Pas de wash sur un vide.

---

## 7. Animations

La motion explique, confirme ou maintient une continuité spatiale. Elle ne décore pas. Sans objectif
nommable, l’état change instantanément.

### Décision

| Fréquence                                  | Traitement                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| Navigation / raccourci, 100+ fois par jour | Aucun mouvement. Changement instantané.                                      |
| Liste / hover, dizaines de fois par jour   | Couleur ou opacity 100–160 ms ; mouvement supprimé sauf nécessité explicite. |
| Overlay occasionnel                        | Motion standard de la primitive, 200–300 ms.                                 |
| Geste piloté                               | La primitive suit le geste ; Drawer peut aller jusqu’à 500 ms au relâcher.   |
| Signal rare                                | Un burst fini, jamais une boucle.                                            |

Objectifs autorisés : feedback, indication d’état, continuité spatiale, prévention d’un saut
visuel. « Faire joli » n’est pas un objectif.

### Outil minimal

1. Drawer, Dialog, Popover, Tooltip, Menu, Collapsible et Toast gardent la motion Base UI.
2. Hover, press, couleur et état piloté par attribut : transition CSS ciblée.
3. Entrée d’un contenu monté : CSS `@starting-style`.
4. Séquence prédéterminée : animation CSS.
5. Contrôle programmatique et interruptible : WAAPI `element.animate()`.
6. rAF métier : mascotte uniquement.

Pas de dépendance d’animation, de wrapper autour d’une primitive, de View Transition pour un état
local ou de moteur d’exit React.

### Propriétés

`transform` et `opacity` uniquement. `clip-path` est admis pour une révélation masquée. `height`
n’est admis que dans les primitives Collapsible et Toast Base UI, quand la taille mesurée constitue
leur comportement ; jamais dans un wrapper feature. Interdits : `transition: all`, animation de
`display`, `width`, `grid-template-*`, margin, padding, top ou left, filter animé sur une série
d’éléments, et variable CSS sur un parent pour piloter le transform d’enfants.

Hover avec mouvement : uniquement sous `@media (hover: hover) and (pointer: fine)`. Un press
utilise la translation de 1 px portée par `Button`. La porte métier est l’exception nommée
ci-dessous ; un seul sélecteur possède son `transform`.

### Courbes et budgets

| Usage                      | Durée      | Courbe                            |
| -------------------------- | ---------- | --------------------------------- |
| Press / feedback           | 100–160 ms | `cubic-bezier(0.23, 1, 0.32, 1)`  |
| Tooltip / petit popover    | 125–200 ms | `cubic-bezier(0.23, 1, 0.32, 1)`  |
| Dropdown / Select          | 150–250 ms | `cubic-bezier(0.23, 1, 0.32, 1)`  |
| Reveal Composer            | 160 ms     | `cubic-bezier(0.23, 1, 0.32, 1)`  |
| Mouvement à l’écran        | ≤ 300 ms   | `cubic-bezier(0.77, 0, 0.175, 1)` |
| Drawer piloté par un geste | 200–500 ms | `cubic-bezier(0.32, 0.72, 0, 1)`  |

Jamais `ease-in`. Une animation d’UI hors Drawer gestuel ne dépasse pas 300 ms.
Les utilitaires Tailwind v4 correspondants sont `ease-pierre-out`, `ease-pierre-in-out` et
`ease-pierre-drawer`, définis dans `globals.css`. Pas de cubic-bezier local si l’un des trois
s’applique.

### Patterns nommés

- **Navigation globale et pages** — instantanée, y compris Accueil. Les surfaces sœurs ne
  crossfadent pas.
- **Porte métier** — unique delight de l’accueil, déclenché par un pointeur fin. Survol :
  porte `translateY(-2px) scale(1.006)` en 180 ms et icône
  `translate3d(3px, -2px, 0) rotate(2deg)` en 220 ms, `ease-pierre-out`. Pression :
  `translateY(1px) scale(0.99)` en 100 ms, icône ramenée vers sa position. Transitions CSS
  interruptibles, transform uniquement. Aucun montage, stagger, suivi de pointeur, JS ou ombre.
- **Drawer / Inspector** — motion de la primitive seulement. Le variant default conserve snap et
  nested upstream ; `activity` et `inspector` limitent leur transition à transform + opacity. Aucun
  reveal du header ou du split.
- **Composer Inspector** — la pile initiale est statique ; seul le shell entrant utilise
  `@starting-style`, opacity + translateY(8 px), 160 ms. Annuler restaure la pile immédiatement.
- **Notifications** — hausse du compteur uniquement : un burst WAAPI interruptible, ≤ 300 ms.
  Montage, ouverture et baisse ne rejouent rien.
- **Work feed** — aucun stagger. Les contrôles secondaires peuvent apparaître par opacity 160 ms,
  avec hover fin et focus clavier.
- **À faire** — lecture et édition se remplacent instantanément. Aucune animation.
- **Toast** — transform + opacity interruptibles. La hauteur mesurée du stack Base UI est
  l’exception primitive ; aucune feature ne la recopie.
- **Contenu généré** — règle partagée par `globals.css` et le chat public : opacity +
  translateY(2 px), 200 ms, stagger 40 ms, backlog 24. Aucun `display` ou filter animé. Caret
  opacity, outils et questionnaires immédiats.
- **Mascotte** — seule surface vivante en rAF. `prefers-reduced-motion` fige respiration, regard,
  orbite et pastille.

### Reduced motion

Chaque pattern porte son media query ou son garde natif. Le fallback global à 0,01 ms est un filet
de sécurité, pas une implémentation. Les déplacements disparaissent ; une opacity courte peut
rester si elle aide à comprendre. Le Composer reste un swap immédiat, le burst Notifications ne
se joue pas, la porte métier garde son pigment sans mouvement et la mascotte devient statique.

### Vérification

Tester à vitesse normale puis 5× dans DevTools, interrompre à mi-course, vérifier le point
d’origine, émuler `prefers-reduced-motion`, et profiler les surfaces répétées. Une motion
impossible à juger dans le code se valide frame par frame ; elle n’est pas approuvée par défaut.

---

## 8. Tables et listes

### DualTable — Boards uniquement

Paper continu. Pas de Card. Deux
`<table className="text-table table-fixed font-sans tabular-nums">` + deux
`colgroup`. Scroll H sync. Headers sticky `h-8`. `DataColumnHeader` : label Geist Sans 12/16
semibold muted + menu Filter. Pas de pinning, pas de DnD.
Lignes ~32, `hover:bg-muted/50`. Cellules = Geist Sans 13, `tabular-nums`,
**`text-start`**. En-têtes colonnes = Geist Sans 11, aussi à gauche. Empty / loading dans
la table. Virtualisation si nécessaire.

Rubrique, thead et lignes = `bg-background`. Hiérarchie par filets, typo (rubrique Geist Sans `text-xl` / colonnes Geist Sans 11 px / cellules Geist Sans 13), pas par fond. CTA rubrique = `variant="outline"` stock. Impayés = pile de rubriques (`RepaymentBucketSection`). Tickets = une rubrique. Pills colorize (`TableCellValue`) = `Badge` + label ; couleur = fill + encre + filet mix(bg, text), pas de swatch. **Interdit :** fusionner les buckets, KPI cards, DualTable hors Board, lavage de chrome, `text-end` en cellule ou en-tête.

### Directory

Paper. Hover / selected `bg-muted`. Séparateur `/60` ou whitespace. Jamais Card autour. IDs = Geist Sans `tabular-nums`. Dates / horodatages = Geist Sans `tabular-nums`, jamais Geist Mono. **Alignement = `text-start` partout** (identité, accès, génération, actions) — jamais `text-end` / `justify-end` dans la ligne. Directory = une rubrique par onglet (Automatisations, Contacter par lots) — identité empilée (nom + description, 2 lignes max) + métadonnées en colonnes alignées, grille partagée, colonne actions réservée. Historique d’un traitement de masse = pile de rubriques + table Geist Sans 13, pas `DirectoryList`, pas DualTable. Interdit de fusionner les buckets. Notifications, activités et tâches : **Work feed**, pas cette liste.

### Toolbars

`h-7`, buttons `sm`, ghost / outline, une seule barre. Search = `InputGroup`, une instance visible. Board : filtres dans le menu de colonne. Find-in-page = overlay distinct.

---

## 9. Accessibilité

Focus visible (`ring-2 ring-ring/20`). Contraste AA body. `prefers-reduced-motion` honoré (`globals.css`). Contrôles nommés. Pas d’interaction souris-only. `prefers-contrast: more` → muted-foreground = ink.

---

## 10. Responsive Electron

Fenêtre desktop, pas un site. Pas de breakpoint mobile comme cible. Largeur utile : table + Inspector 60 rem ; inbox 24 rem à gauche. TitleBar drag ; contrôles `.no-drag`.

---

## 11. Anti-patterns

Ne pas introduire / supprimer :

- gap hors 4/8/16/24 comme rythme de page
- `text-xs` pour les labels (sauf Inspector compose)
- `text-sm` pour les descriptions
- `text-xs` à la place de `FieldDescription`
- override local des primitives
- nouvelle variante Button / Badge / Input
- Card comme page shell, form shell, ou Directory shell
- padding conditionnel par tab dans `App.tsx`
- `p-6` sur un enfant déjà paddé
- h1 sur Board / Split / Conversation
- `rounded-lg` / `xl` / `2xl` sur canvas
- ombre de page
- deux primaires visuelles sur une même surface
- `size="lg"` comme défaut
- Empty bricolé
- `window.confirm`
- DualTable hors Board
- KPI cards
- `text-end` / `justify-end` dans un DualTable ou une ligne Directory
- couleur de chrome pour hiérarchiser
- pigments d’accueil hors Home
- nouvelle famille de police
- ChoiceTile local
- Sheet métier
- pixel-perfect d’un écran contre le contrat
- préfixe « DEMONSTRATION - » comme chrome
- `text-xl` comme titre de section dans le corps d’un formulaire
- `FieldTitle` 14 comme faux titre de section dans l’éditeur Directory
- Login étiré en Document (`max-w-2xl`, `overflow-y-auto`)
- `DrawerFooter` / footer sticky dans un Inspector
- Toolbar métier dans un header de Drawer
- Troisième chrome de dossier à côté de l’Inspector (`ItemGroup`, Sheet)
- Empty pleine surface dans un Inspector dont le présent est déjà rendu

---

## 12. Exceptions volontairement conservées

| Exception                   | Pourquoi                                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hex des statuts             | Données métier, pas chrome                                                                                                                                         |
| Reports HTML                | Hors React                                                                                                                                                         |
| Mascotte                    | Hors React                                                                                                                                                         |
| DualTable                   | Boards uniquement                                                                                                                                                  |
| Conversation                | Famille propre (`max-w-3xl`). Composer web : `rounded-xl` sur papier blanc. Composer Discuter : contrôle du formulaire structuré.                                  |
| Quick chat                  | Ombre neutre dédiée à trois couches (`--shadow-chat-window`) pour l’unique centre de gravité flottant ; aucune aura colorée ni glass. La page Discuter n’en a pas. |
| Workspace                   | Famille propre                                                                                                                                                     |
| ActivityReader              | Overlay lecteur : `max-w-3xl`, `rounded-t-xl`                                                                                                                      |
| Drawer Base UI default      | Snap points et nested upstream conservent height/filter. Les variants Pierre les neutralisent et restent transform + opacity.                                      |
| Burst Notifications WAAPI   | L’API `KeyframeEffect` reçoit la courbe canonique en valeur littérale ; elle ne résout pas les variables CSS du thème.                                             |
| Login coquille compacte     | Première surface : fenêtre calée sur la pile                                                                                                                       |
| Login, deux phrases légales | Serif 12/16 au lieu du 14/19 d’aide. La coquille ne tient pas ce corps. Refusé : une taille de `FieldDescription`, un `text-xs` sur le titre.                      |
| Prestataires, champs        | Adresses, modèles, clés, UUID et HTML se lisent et se collent en Geist Mono. Refusé : Geist Sans sur ces champs, mono sur le reste de l’administration.            |

---

## 13. Règle de décision

Pour chaque problème UI :

1. Quelle est la page type ?
2. Quels patterns sont nécessaires ?
3. Quelle primitive existante doit être utilisée ?
4. Peut-on résoudre le problème sans nouvelle règle ?
5. Si non : **STOP** et vérifier si cette nouvelle règle mérite d’entrer dans ce document.

Ne jamais résoudre un problème par un override local simplement parce que c’est plus rapide.

---

## 14. The Pierre Visual Test

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
11. Ombre sur la page ?
12. `App.tsx` connaît-il encore le padding de cette tab ?
13. Ce cas invente-t-il une règle locale au lieu d’utiliser un pattern ?
14. Cet Inspector est-il une page miniature (footer, KPI, DualTable, Document) ?
