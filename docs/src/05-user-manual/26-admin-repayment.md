# Paramétrer les impayés

`repayment.json` règle le module « Impayés ». On le colle dans `Administration` → `Impayés` → `Configuration`. Les textes affichés sont en français. Les clés sont en anglais.

La consigne de l’agent n’est pas dans ce JSON. Elle se dépose dans le champ `Consigne` (`repayment/AGENTS.md`). Pierre l’utilise lorsqu’un chargé lui demande, pour chaque dossier sélectionné, une réponse possible, une synthèse ou une autre consigne. Il n’envoie rien : le résultat est enregistré dans l’historique du dossier. Les quatre modèles Word se déposent dans `Documents` : plan d’apurement, protocole de cohésion sociale, diagnostic social et financier, courrier standard. L’export des trois premiers est décrit dans [Documents Word](#documents-word). Les messages RCS et courriel se collent dans `Messages`, une zone par message. `Vérifier`, sous chaque zone, contrôle le texte sans l’enregistrer. `Enregistrer` écrit toute la collection.

## Exemple minimal

```json
{
  "phases": ["Non traités", "Clients partis"],
  "caseActions": ["Analyser le dossier"],
  "batchActions": ["Envoyer un RCS de relance"],
  "tags": ["Décès"],
  "senderEmail": "loyer@dribble.football",
  "schedule": {
    "defaultInstallments": 6,
    "maxEffortPercent": 35,
    "minDailyRemainderEuros": 15,
    "confirmAfterInstallments": {
      "12": "Un échéancier de plus de 12 mensualités doit être confirmé."
    }
  }
}
```

L’exemple complet livré avec PIERRE est [`repayment.json`](./repayment.json).

## Les clés

| Clé            | Obligatoire        | Ce qu’on écrit                    | Effet                                                                                                              |
| -------------- | ------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `phases`       | oui, au moins deux | Libellés, dans l’ordre de la pile | Une rubrique du tableau par libellé. Une phase vide reste une ligne compacte. Le texte est l’identité enregistrée. |
| `caseActions`  | oui                | Actes d’un dossier                | Menu « Consigner une action » et tâches.                                                                           |
| `batchActions` | oui                | Actes d’un envoi groupé           | Actions proposées dans Contacter par lots.                                                                         |
| `tags`         | oui                | Étiquettes                        | Menu « Changer les tags ».                                                                                         |
| `senderEmail`  | non                | Adresse du domaine d’envoi        | Expéditeur des e-mails du module. Absente, l’envoi d’e-mail est refusé.                                            |
| `schedule`     | oui                | Nombres et confirmations          | Règles du prochain échéancier.                                                                                     |

`schedule` :

| Clé                        | Effet                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `defaultInstallments`      | Nombre d’échéances proposé à l’ouverture. Entier de 1 à 36.                                                                       |
| `maxEffortPercent`         | Taux d’effort plafond. `35` signifie 35 %.                                                                                        |
| `minDailyRemainderEuros`   | Reste-à-vivre plancher, en euros par jour et par unité de consommation.                                                           |
| `confirmAfterInstallments` | Objet, éventuellement vide. La clé est un nombre d’échéances, la valeur est la phrase à confirmer avant d’en ajouter une de plus. |

Une clé absente de ces listes est refusée : `clé inconnue`. Un libellé vide, un doublon, ou le texte `À reclasser` dans `phases`, aussi.

## Messages

Un JSON est un RCS : `group`, `action`, `label`, `body`, `choices`, et `sms_fallback` s’il diffère du corps. Un Markdown est un courriel. Son frontmatter porte `group`, `action`, `to`, `label`, `subject`. `to: locataire` n’a pas d’adresse : elle vient du dossier. `to: caf` exige `email`. Le couple `group` + `label` est unique. `Vérifier` dit ce qui manque. `Tester` envoie le RCS à un numéro, le courriel locataire à l’administrateur connecté, et ouvre le client mail pour la CAF.

## L’ordre

- La **première** phase reçoit un dossier qui n’a pas encore de phase.
- La **dernière** phase reçoit les locataires absents des lots. On peut changer son libellé. La déplacer change qui reçoit ces locataires.
- Les rubriques du menu « Contacter un tiers » sont les `group` des messages. Les groupes, puis les libellés, sont triés en français.

## Renommer

Le texte est copié tel quel dans l’historique. Le renommer crée une valeur nouvelle. Rien n’est réécrit.

- **Une phase.** Les dossiers qui portaient l’ancien libellé apparaissent dans `À reclasser`. L’historique garde l’ancienne phrase. `À reclasser` n’est pas une phase du JSON : elle s’affiche seulement s’il y a des dossiers à ranger, et on ne peut pas l’y écrire. Depuis le dossier, `Changer la phase` les range dans une phase actuelle.
- **La première ou la dernière place, sans changer les textes.** Les dossiers restent où ils sont. Seul le rôle automatique change.
- **Un acte ou un tag.** L’historique garde l’ancien mot. Le menu propose le nouveau. Un tag retiré quitte l’état courant du dossier. Un traitement par lots qui cite encore l’ancienne valeur reste ouvrable, mais son enregistrement et son exécution sont refusés tant qu’elle y figure.
- **Un message.** Le retirer de `Messages` le retire du menu. Les messages déjà envoyés ne changent pas.
- **`senderEmail`.** Seuls les prochains envois partent de la nouvelle adresse.
- **`schedule`.** Seul le prochain échéancier en cours de saisie s’en sert. Un plan déjà enregistré garde ses chiffres.

## Documents Word

Le plan, le protocole et le diagnostic s’exportent depuis le formulaire d’apurement, en Word et en PDF. Pierre remplit le modèle déposé, puis transforme ce Word en PDF. Le PDF reprend donc les mêmes données et la police incorporée, mais ce n’est pas l’enregistrement PDF de Microsoft Word : la mise en page est recalculée. Un tableau, un paragraphe, une image, un en-tête, un pied de page et les champs `PAGE` et `NUMPAGES` passent. Évitez les macros, le SmartArt, les objets incorporés, les liens vers une police externe, les zones de texte qui portent une balise, et tout champ Word autre que le numéro de page.

Le modèle utilise une seule police, incorporée en quatre graisses : romain, gras, italique, gras italique. Pierre refuse le dépôt comme l’export si une graisse manque, si une balise ne fait pas partie du contrat, ou si une balise du contrat a disparu. Un fichier de plus de 5 Mo est aussi refusé.

Pour incorporer la police dans Word :

- Windows : `Fichier > Options > Enregistrement`, cochez `Incorporer les polices dans le fichier`. Décochez `Incorporer uniquement les caractères utilisés dans le document` et `Ne pas incorporer les polices système courantes`.
- macOS, avec Microsoft 365 : `Word > Préférences > Enregistrement`, sous `Incorporation des polices`, cochez `Incorporer les polices dans le fichier`. S’il existe un choix, incorporez tous les caractères.

Enregistrez en `.docx`, fermez le fichier, rouvrez-le pour vérifier la police, puis déposez-le. La police doit autoriser l’incorporation dans un document. C’est le cas de Times New Roman livré avec Windows et Microsoft 365 (« editable embedding »). Ce droit ne permet pas de redistribuer le fichier de police seul. Microsoft décrit l’incorporation dans [Benefits of embedding custom fonts](https://support.microsoft.com/en-us/office/fonts/benefits-of-embedding-custom-fonts) et les limites de licence dans la [Font redistribution FAQ](https://learn.microsoft.com/en-us/typography/fonts/font-faq).

Les balises s’écrivent `{{NOM}}`. Une répétition tient sur une seule ligne de tableau : `{{#ADULTES}}` dans la première cellule, `{{/ADULTES}}` dans la dernière. Les trois modèles partagent l’identité, le foyer, les ressources, les charges et leurs totaux. Le diagnostic ajoute la procédure, l’accompagnement et le bail. Le plan et le protocole ajoutent la dette et l’échéancier. Les ressources et charges ponctuelles ont les colonnes type, personne, mois et montant.

Les saisies du formulaire qui n’ont pas de balise ne sortent pas : motifs et ancienne dette, date du stade, fin de moratoire, visite à domicile, détail du travailleur social au-delà de son nom, contentieux antérieur, garant, personne et fin de crédit des charges mensuelles, interrupteur de l’échéancier, et les colonnes calculées à l’écran.
