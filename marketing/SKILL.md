---
name: marketing
description: Conçoit et révise les affiches LinkedIn de PIERRE. À utiliser pour transformer un sujet PIERRE, CARL ou lié au mouvement HLM en affiche factuelle, lisible sur téléphone et conforme à la grammaire marketing du projet.
---

# Marketing PIERRE

## Avant de créer

1. Lire [`README.md`](./README.md). La grammaire qui s’y trouve s’applique telle quelle.
2. Lire le `README.md` de la campagne et les pages de documentation du sujet.
3. Vérifier la licence avant toute mention de l’ouverture du code ou des modèles.
4. Extraire les formulations, chiffres, performances, noms propres et caractéristiques explicitement documentés.
5. Définir une thèse dominante, puis organiser sa démonstration en mécanismes et preuves.

Si le brief laisse le message principal ou les données à choisir, retenir l’affirmation la plus ambitieuse que les sources permettent de soutenir. Regrouper les caractéristiques proches en familles cohérentes plutôt que les transformer en collection de badges.

`mouvement HLM` ou `bailleurs sociaux` doit être identifiable en trois secondes sur un téléphone. `HLM` ne s’écrit jamais seul. Si la thèse et ses preuves ne tiennent pas sur le carré, couper. Les détails restent dans le post, ou dans un pitch demandé ensuite.

## Concevoir l’affiche

- Partir du message, jamais d’une décoration.
- Empiler signature, promesse, produit, preuves, dans cet ordre.
- Composer pour le fil LinkedIn sur téléphone. L’export reste `1200 × 1200 px`.
- Une campagne produit une seule affiche : `poster.html`, `poster.css`, `poster.png`. Pas de variante, pas de carrousel, pas de suffixe.
- Utiliser exclusivement la palette **Bleu encre + mandarine**. Ne pas inventer de variante. Dériver les transparences en OKLAB.
- Fixer les tailles de texte. Ne pas mesurer les glyphes en JavaScript.
- Donner au produit la graphie de PIERRE : Inter `700`, interlettrage `0`.
- Écrire le numéro de version seul, dans un cercle, sans le mot « version ».
- Tenir les deux fonctions sur une ligne chacune : négation sur papier, action sur mandarine.
- Dans un cartouche de preuves, donner à tous les titres la même taille, au moins celle des libellés. Une colonne de cases par famille, du plus court au plus long, entièrement dans le cadre.

Si PIERRE ou un socle CORE apparaît, suivre la signature du [`README.md`](./README.md). Expliciter la relation entre le produit annoncé et PIERRE.

L’inspiration issue d’une marque tierce reste au niveau des principes. Ne jamais reproduire son personnage, sa composition, son texte ou ses signes distinctifs.

## Règles éditoriales

- Respecter scrupuleusement les textes, chiffres, noms propres et formulations fournis.
- Ne jamais inventer une performance, un label, une caractéristique ou un partenariat.
- Employer **open code** pour PIERRE et **poids ouverts (open-weight)** à la première occurrence pour les modèles concernés.
- Ne pas qualifier PIERRE d’« open source » sauf changement explicite de licence.
- Employer un français direct et faire précéder le jargon technique par sa signification.
- Écrire les affirmations en casse phrase. Réserver les capitales aux acronymes et aux libellés courts.
- Préférer une phrase forte à une accumulation de slogans de même niveau.
- Écrire en français correct, avec accents et espaces typographiques cohérents.
- Employer la formulation exacte des sources pour les données d’entraînement, contributions et partenariats.

## Rendu

Depuis la racine du dépôt :

```bash
bun run --cwd marketing render
bun run --cwd marketing render <campagne>
```

## Contrôle final

- [ ] Le mouvement HLM ou les bailleurs sociaux sont identifiables en trois secondes sur téléphone.
- [ ] Une thèse domine et les autres informations la démontrent.
- [ ] La relation avec PIERRE est explicite lorsque le produit en fait partie.
- [ ] Tous les faits sont reliés à une source du dépôt.
- [ ] Aucun chiffre ou qualificatif n’a été ajouté par extrapolation.
- [ ] Les catégories métier et les termes techniques sont fidèles et compréhensibles.
- [ ] La création ne repose sur aucun cliché visuel de l’IA.
- [ ] La création utilise uniquement Papier calcaire, Encre nuit, Bleu encre et Mandarine.
- [ ] L’affiche suit l’empilement, les signatures, le cercle de version, les deux fonctions et les preuves décrits dans le README.
- [ ] Les titres d’un même cartouche ont la même taille, au moins celle des libellés, et les cases restent dans le cadre.
- [ ] Le texte est lisible à environ `300 px` de large.
- [ ] L’export mesure exactement `1200 × 1200 px`.
