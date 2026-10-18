# Plan d’apurement — tokens

Une page. Une rampe. Les composants ne voient que les rôles.

Rampe neutre en OKLCH, teinte 78, pas de clarté 0,176. Le chroma reste bas pour que la teinte ne dessine pas l’harmonie : la clarté le fait. Le danger est le seul hue à part.

| Cran                    | Jeton          | Rôle                                          |
| ----------------------- | -------------- | --------------------------------------------- |
| `oklch(0.975 0.01 78)`  | `--ref-paper`  | `background`, `primary-foreground`, `popover` |
| `oklch(0.799 0.01 78)`  | —              | cran de rampe, non assigné                    |
| `oklch(0.623 0.01 78)`  | `--ref-line`   | `border`, `input`                             |
| `oklch(0.447 0.012 78)` | `--ref-meta`   | `muted-foreground`                            |
| `oklch(0.271 0.014 78)` | `--ref-ink`    | `foreground`, `primary`, `ring`               |
| `oklch(0.48 0.14 28)`   | `--ref-danger` | `destructive`                                 |

`muted` et `accent` ne sont pas un sixième cran : `color-mix(in oklch, var(--ref-ink) 7%, var(--ref-paper))`.

Contrastes sur le papier, WCAG 2 et APCA (formule SAPC publique, pas une librairie certifiée) :

| Paire                     | WCAG   | APCA |
| ------------------------- | ------ | ---- |
| Encre / papier            | 14,0:1 | 94   |
| Encre secondaire / papier | 7,0:1  | 78   |
| Filet / papier            | 3,4:1  | 56   |
| Danger / papier           | 6,5:1  | 76   |

Texte courant au-dessus de 4,5:1. Filet de champ vide au-dessus de 3:1.

Rythme 4 / 8 / 16 / 24. Contrôles 32 px. Un rayon, 6 px. Une sans, celle du système.
