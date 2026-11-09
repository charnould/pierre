# Marketing PIERRE

Ce répertoire fixe la grammaire des affiches LinkedIn de PIERRE et conserve leurs sources. Le message change d’une campagne à l’autre. La grammaire, non.

Avant toute création, lire [`SKILL.md`](./SKILL.md).

## Public

PIERRE s’adresse en priorité :

- au mouvement HLM ;
- aux fédérations du mouvement HLM ;
- aux bailleurs sociaux.

La communication ne suppose pas une culture technique. Elle rend d’abord évidents le métier, le bénéfice et la maîtrise offerte, puis explique la technologie avec des mots précis. Elle peut être audacieuse, mais doit rester crédible auprès d’organisations habituées à une communication institutionnelle classique.

## Positionnement

PIERRE doit évoquer une technologie :

- maîtrisée, ouverte et souveraine ;
- utile et accessible ;
- ambitieuse sans être futuriste ou abstraite ;
- profondément ancrée dans les métiers du logement social.

L’identité évite à la fois le corporate institutionnel traditionnel, l’esthétique froide des entreprises technologiques et les codes visuels réservés aux outils pour développeurs.

L’audace typographique et la culture de la preuve peuvent s’inspirer des meilleures communications de produits open code. Ne jamais reprendre un personnage, une composition, une formulation ou un autre signe propriétaire d’une marque tierce.

## Grammaire de l’affiche

Toute affiche est un carré LinkedIn lu sur téléphone. L’export mesure `1200 × 1200 px`. La taille de décision est la largeur du fil sur un petit téléphone, environ `300 px`. Une campagne, une affiche. Jamais de carrousel, jamais de seconde composition.

L’affiche empile quatre blocs, dans cet ordre :

1. signature ;
2. promesse ;
3. produit ;
4. preuves.

Un cadre encre tient l’ensemble. Les blocs sont pleins, les contours épais, les ombres courtes et décalées, les rotations légères. Pas de monogramme, pas de numéro de série, pas de mention en bas de page.

### Couleurs

**Bleu encre + mandarine**, quatre couleurs, rien d’autre :

- **Papier calcaire** — `oklch(0.96 0.018 80)` : fond ;
- **Encre nuit** — `oklch(0.18 0.025 260)` : texte, contours, ombres ;
- **Bleu encre** — `oklch(0.40 0.13 255)` : aplat produit ;
- **Mandarine** — `oklch(0.78 0.16 55)` : promesse, chiffre, sélection.

Pas de cinquième couleur. Les transparences se calculent en OKLAB. L’éclat radial, s’il existe, ne vit que dans l’aplat produit : papier en transparence, construit en CSS, sans visuel tiers.

Cette palette est celle du marketing. L’application desktop conserve ses tokens.

### Typographie

- **Inter**, interlettrage `0`, pour les signatures et les logotypes. `PIERRE` est en graisse `700`. Un socle affiché à côté, comme `CORE MODELS HLM`, a la même taille, la même famille et le même interlettrage, en graisse `600`. Un logotype produit reprend Inter `700` et l’interlettrage `0`. Sa taille, sa couleur et la rotation de son bloc peuvent varier.
- **Geist Sans** pour le propos.
- **Geist Mono** pour les littéraux techniques, dont le numéro de version.
- Pas de Geist Serif.

Les tailles sont fixes : les plus grandes qui tiennent sur leur ligne. Pas de script qui mesure les glyphes. Les fontes sont dans [`desktop/src/assets/fonts`](../desktop/src/assets/fonts). Le wordmark reprend `.article h1` de [`docs/scripts/site.css`](../docs/scripts/site.css).

### Blocs

- **Promesse.** Une ligne de contexte, un cartouche mandarine sur une seule ligne, une précision pleine largeur.
- **Produit.** Le nom en logotype. Le numéro seul, dans un cercle, sans le mot « version ». Deux fonctions, une ligne chacune : la négation sur papier, l’action sur mandarine. Le bloc produit peut tourner légèrement. Le cartouche de preuves reste horizontal.
- **Preuves.** Un cartouche, une colonne par famille, une seule colonne de cases, du libellé le plus court au plus long. Les cases restent dans le cadre. Les titres d’un même cartouche ont exactement la même taille, au moins celle des libellés. Capitales et graisse `900` pour le titre. Casse phrase et graisse `750` pour le libellé.

## Principes éditoriaux

1. Partir du public : cible, promesse, fonctionnement, preuves.
2. `mouvement HLM` ou `bailleurs sociaux` appartient au premier niveau de lecture. `HLM` ne s’emploie jamais seul.
3. Le message principal doit être compris en trois secondes dans un fil LinkedIn sur téléphone.
4. Une affiche porte une thèse dominante. Les détails la démontrent sans lui faire concurrence.
5. Regrouper les caractéristiques proches en familles de preuves plutôt qu’en nuée de badges.
6. Chaque chiffre, performance, caractéristique, label et nom propre doit être vérifié dans la documentation.
7. Employer un français direct. Expliquer un terme anglais lors de sa première apparition.
8. Réserver les capitales aux acronymes et aux libellés courts. Écrire les affirmations en casse phrase.
9. Montrer ce que le produit fait plutôt que représenter abstraitement l’intelligence artificielle.
10. Bannir cerveaux numériques, robots humanoïdes, circuits lumineux, réseaux de neurones et interfaces holographiques.

Pour PIERRE, employer **open code**. Pour les modèles concernés, écrire **open-weight** à la première occurrence.

## Campagnes

Chaque campagne vit dans `campaigns/<sujet>/` :

- `README.md` : message, faits, sources ;
- `poster.html` et `poster.css` : la source ;
- `poster.png` : l’export.

Depuis la racine du dépôt :

```bash
bun run --cwd marketing render
bun run --cwd marketing render carl-launch
```

La première commande rend toutes les campagnes, l’une après l’autre. La seconde n’en rend qu’une.

Le script est [`scripts/render-poster.ts`](./scripts/render-poster.ts). `Bun.WebView` utilise
Chrome, Chromium, Edge ou Brave pour rendre les affiches avec Blink. Définir `BUN_CHROME_PATH`
si Bun ne détecte pas automatiquement le navigateur.

## Sources de vérité

- positionnement : [`docs/src/index.md`](../docs/src/index.md) ;
- Core Models HLM : [`docs/src/03-core-models-hlm/index.md`](../docs/src/03-core-models-hlm/index.md) ;
- CARL : [`docs/src/03-core-models-hlm/CARL.md`](../docs/src/03-core-models-hlm/CARL.md) ;
- droits d’usage : [`LICENSE.md`](../LICENSE.md) ;
- design du produit : [`desktop/DESIGN.md`](../desktop/DESIGN.md) ;
- wordmark : [`docs/scripts/site.css`](../docs/scripts/site.css).

Les images situées dans `docs/src/04-core-intelligence-hlm/Paramétrages de PIERRE/` sont des exemples de personnalisation d’un bailleur, pas l’identité de PIERRE.
