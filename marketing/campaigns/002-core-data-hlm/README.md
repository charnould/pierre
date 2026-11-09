# Core Data HLM

## Objectif

Présenter le socle de données du mouvement HLM : quelques données suffisent pour une IA HLM vraiment utile, et ce socle est l’un des trois de PIERRE.

Public : mouvement HLM et bailleurs sociaux.

## Texte de l’affiche

La grammaire est celle de [`../../README.md`](../../README.md). L’affiche dit, dans cet ordre :

1. `PIERRE` et `CORE DATA HLM` ;
2. `Quelques données suffisent` ;
3. `pour une IA HLM vraiment utile` ;
4. `Pas besoin de 100 exports, ni de projet data sur 12 mois.` ;
5. `CORE DATA HLM` ;
6. `Donner un langage commun aux humains et aux machines.` ;
7. `Permettre à l'IA de manipuler en autonomie vos données.` ;
8. 5 fichiers CSV : Travaux, Candidats, Lots locatifs, Réclamations, Comptes locataires ;
9. Une convention : Minimal, Extensible, En français, Auto-explicatif, Robuste + Structuré.

La ligne « 100 exports » et « 12 mois » est le choix de formulation de l’affiche. Lots locatifs et comptes locataires sont en `v1.0.0-beta`. Réclamations, travaux et candidats restent en réflexion. La coche dit qu’un fichier fait partie des cinq, pas qu’il est figé.

## Absents

- Grand Dijon Habitat, à l’origine du référentiel ;
- Hermes, Pi, Claude Cowork et Codex : le socle n’est pas réservé à PIERRE, le dire sur l’affiche brouillerait la signature ;
- la licence CC BY-SA 4.0, tenue ici et non en badge ;
- `open code` et `open source`, qui ne qualifient pas ce socle ;
- UTF-8, le point-virgule, ISO 8601 et les noms de colonnes ;
- `100 %`, « instant T » et « jamais de deltas » : vrais, trop techniques pour la ligne.

## Sources

- [`docs/src/02-core-data-hlm/index.md`](../../../docs/src/02-core-data-hlm/index.md) : meilleures données, pas une copie du SI, langage commun, cinq fichiers, minimal, auto-explicatif, extensible, français, claires, structurées et prévisibles, versions ;
- [`docs/src/index.md`](../../../docs/src/index.md) : Core Data HLM comme socle de PIERRE, « minimal, robuste et intelligible », « donne aux données un langage commun pour les humains et les machines » ;
- [`LICENSE.md`](../../../LICENSE.md) : CC BY-SA 4.0 pour Core Data HLM.

## Fichiers

`poster.html`, `poster.css`, `poster.png`.

```bash
bun run --cwd marketing render core-data-hlm
```
