# Lancement de CARL

## Objectif

Annoncer le premier modèle d’intelligence artificielle entraîné spécifiquement pour les métiers du mouvement HLM, rendre sa fonction immédiatement compréhensible et montrer qu’il appartient à PIERRE.

Public : mouvement HLM et bailleurs sociaux.

## Texte de l’affiche

La grammaire est celle de [`../../README.md`](../../README.md). L’affiche dit, dans cet ordre :

1. `PIERRE` et `CORE MODELS HLM` ;
2. `Le mouvement HLM a son` ;
3. `premier modèle d’IA` ;
4. `ouvert, hyper-spécialisé, frugal et souverain.` ;
5. `CARL` et `1.0` ;
6. `Il ne rédige pas les réponses aux locataires et candidats.` ;
7. `Il qualifie les messages parmi 270 motifs, en 25 ms.` ;
8. Domaines métier : Technique, Assistance, Administratif, Tranquillité résidentielle ;
9. Dimensions transverses : Ton, Lieu, Intégrité physique, Obligation réglementaire.

CARL est un classifieur ModernBERT. On écrit « modèle d’IA ». Le cercle affiche `1.0`. La version documentée est `carl-1.0.1`.

## Absents

- Grand Dijon Habitat et les données d’entraînement ;
- le fonctionnement sans GPU ;
- `User-First × IA-First` ;
- un bandeau technique séparé ;
- `inexploitable` et `hors_perimetre`, qui ne sont pas des domaines métier ;
- un personnage ou une illustration d’IA.

## Sources

- [`docs/src/03-core-models-hlm/CARL.md`](../../../docs/src/03-core-models-hlm/CARL.md) : fonction, taxonomie, architecture, 50 millisecondes, 270 motifs, version `carl-1.0.1` et données d’entraînement ;
- [`docs/src/03-core-models-hlm/index.md`](../../../docs/src/03-core-models-hlm/index.md) : poids ouverts, auto-hébergement, spécialisation, frugalité, souveraineté et fonctionnement sans GPU ;
- [`docs/src/index.md`](../../../docs/src/index.md) : relation entre CARL, Core Models HLM et PIERRE ;
- [`LICENSE.md`](../../../LICENSE.md) : droits d’usage.

## Fichiers

`poster.html`, `poster.css`, `poster.png`.

```bash
bun run --cwd marketing render carl-launch
```
