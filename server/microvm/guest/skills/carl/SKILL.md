---
name: carl
description: Qualifie un ou plusieurs messages bruts de locataires ou candidats HLM avec le modèle CARL (domaine, sous-domaine, motif, intégrité physique, lieu, obligation réglementaire, ton). À charger uniquement pour qualifier des messages bruts ; ne pas charger pour des questions générales, des notes internes ou des réclamations déjà qualifiées dans /knowledge/db.sqlite.
---

# Qualifier avec CARL

Utilise la commande `carl` via `bash` pour qualifier un message brut avec le classifieur local CARL :

- Message court : `carl "Bonjour, mon volet roulant est bloqué"`
- Message long ou multiligne (stdin) :
  ```bash
  carl <<'EOF'
  Bonjour,
  mon volet roulant est bloqué depuis mardi.
  EOF
  ```
- Lot de messages : `carl --batch fichier.txt` (1 message par ligne, ou tableau JSON de chaînes pour des messages multilignes ; lit stdin si aucun fichier n'est fourni). Écrit 1 ligne NDJSON par message (`{"texte":...,"output":...}` ou `{"texte":...,"error":...}`).

## Sortie et règles

- Chaque qualification retourne 7 champs : `domaine`, `sous_domaine`, `motif`, `integrite_physique`, `lieu`, `obligation_reglementaire`, `ton`.
- Valeurs spéciales : `hors_perimetre` ou `inexploitable` en `domaine` ; `sans_objet` quand un champ ne s'applique pas (notamment `obligation_reglementaire` hors domaine `technique`).
- CARL retourne une seule qualification par message : la plus aiguë.
- Si `carl` échoue (modèle absent ou serveur injoignable), ne jamais inventer une qualification : signaler l'erreur à l'utilisateur.
