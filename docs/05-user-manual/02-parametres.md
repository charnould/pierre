# Paramètres

`Paramètres` est l’écran de **connexion** quand vous n’êtes pas encore identifié, puis celui de **votre compte** une fois connecté : nom, avatar, compagnon, extraits de l’accueil.

Cette page décrit uniquement l’écran `Paramètres`. Les mots de passe des autres personnes se gèrent dans [Administration · Utilisateurs](./21-admin-utilisateurs.md). L’accueil que vous personnalisez ici est décrit dans [Accueil](./01-accueil.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Se connecter](#se-connecter)
- [Lire l’écran une fois connecté](#lire-lécran-une-fois-connecté)
- [Identité](#identité)
- [Compagnon](#compagnon)
- [Accueil (nombre de lignes)](#accueil-nombre-de-lignes)
- [Applicatifs historiques](#applicatifs-historiques)
- [Fichier d’interface](#fichier-dinterface)
- [Se déconnecter et réinitialiser](#se-déconnecter-et-réinitialiser)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

1. **Entrer dans PIERRE** (adresse du serveur, e-mail, mot de passe, deux confirmations).
2. **Vous reconnaître** dans les historiques et les mentions (nom d’usage, photo).
3. **Régler le compagnon** et le nombre de lignes visibles sur l’accueil.
4. **Vous déconnecter**, chercher une mise à jour, ou tout remettre comme à l’installation.

## Qui peut y accéder

Tout le monde, **même sans être connecté**. C’est le seul écran ouvert aux invités : sans session, vous ne voyez que le formulaire de connexion.

## Se connecter

Au premier lancement, et chaque fois que la session n’est plus valable, l’écran s’intitule `Connexion`.

| Champ          | Rôle                                                             |
| -------------- | ---------------------------------------------------------------- |
| `Serveur`      | Adresse de l’instance de votre organisme, du type `https://…`.   |
| `Email`        | Votre adresse professionnelle. Conservée d’une fois sur l’autre. |
| `Mot de passe` | Jamais mémorisé. Icône œil pour l’afficher.                      |

Deux cases sont **obligatoires** à chaque connexion (elles se décochent si vous changez de serveur) :

1. `J’ai pris connaissance et j’accepte la charte et/ou les consignes IA de mon organisme.`
2. `Je reconnais que les réponses générées par IA peuvent contenir des erreurs et m’engage à vérifier toute information importante avant utilisation.`

Puis `Se connecter`. En cas de succès : message `Connexion réussie`, et vous arrivez sur l’[accueil](./01-accueil.md).

| Message                                                 | Signification                              |
| ------------------------------------------------------- | ------------------------------------------ |
| `Champ obligatoire.`                                    | Un champ est vide.                         |
| `URL invalide. Exemple : http://localhost:3000`         | L’adresse du serveur n’est pas une URL.    |
| `Acceptez les deux conditions pour continuer.`          | Les deux cases ne sont pas cochées.        |
| `Email ou mot de passe incorrect.`                      | Identifiants refusés.                      |
| `Trop de tentatives. Réessayez dans quelques instants.` | Attendez avant de réessayer.               |
| `Impossible de joindre ce serveur.`                     | Réseau, adresse, ou instance indisponible. |
| `Votre session a expiré. Reconnectez-vous.`             | Reconnectez-vous.                          |

Il n’y a pas de « mot de passe oublié » ni de création de compte ici. Un administrateur crée le compte et vous transmet le mot de passe.

> [!NOTE]
> Si une session précédente est encore valable, PIERRE vous reconnecte tout seul au lancement. Sinon, le formulaire revient, avec le serveur et l’e-mail déjà remplis.

## Lire l’écran une fois connecté

Le titre est `Paramètres`. En sous-titre, quand c’est disponible : `e-mail · adresse du serveur · version de l’application`.

Trois boutons en haut à droite :

| Bouton                        | Effet                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Rechercher des mises à jour` | Dans l’application installée : lance une vérification. En développement, ouvre plutôt la page des versions. |
| `Se déconnecter`              | Ferme la session et ramène au formulaire. Le serveur et l’e-mail restent remplis.                           |
| `Réinitialiser`               | Remet l’affichage d’usine, vous déconnecte, et recharge l’application.                                      |

Changer de serveur se fait **après déconnexion**, dans le champ `Serveur` du formulaire. Une fois connecté, l’adresse n’est plus modifiable ici.

## Identité

Section `Identité` — `Nom et avatar affichés dans les timelines et les mentions. Sans nom personnalisé, c’est la partie avant @ de votre email.`

- **Nom d’affichage** : jusqu’à 80 caractères. Il s’enregistre quand vous quittez le champ ou appuyez sur Entrée. Vider le champ (ou y remettre la partie avant `@`) revient au nom par défaut.
- Vous ne pouvez pas prendre le nom de l’assistant de l’instance : `Ce nom est réservé à {agent}.`
- **Modifier votre avatar** : choisissez une photo, cadrez-la dans le cercle (`Zoom`), puis `Enregistrer`. `Réinitialiser` dans cette fenêtre retire le cadrage en cours, pas votre compte.

Le mot de passe **ne se change pas** dans `Paramètres`. Un administrateur le change dans votre fiche, ou vous le changez vous-même si vous êtes administrateur.

## Compagnon

Section `Compagnon` — `Icône flottante. Une pastille signale ce qui n’a pas été lu. Un clic ramène Pierre.`

- Un interrupteur active ou coupe l’icône sur le bureau.
- `Modifier l’apparence` : forme (`Cercle`, `Galet`, `Squircle`, `Capsule`, `Triangle`, `Hexagone`, `Nuage`, `Goutte`), `Couleur` du corps, `Pastille` des non-lues, `Taille` (80 à 240 px). `Aléatoire` propose un autre look. `Réinitialiser` revient à l’apparence d’origine. `Enregistrer` applique ; `Annuler` ignore les essais.

## Accueil (nombre de lignes)

Section `Accueil` — `Nombre d’éléments sur chaque colonne. Tout voir ouvre le tiroir paginé.`

Quatre curseurs, entre 5 et 20, enregistrés tout de suite :

- `Mes notifications`
- `Mes tâches`
- `Tâches que j’ai assignées`
- `Activités`

## Applicatifs historiques

Section `Applicatifs historiques (inactifs à ce stade)`. Trois pastilles (ACG Aravis, Sopra Steria, Aaereon) rappellent le lien prévu avec les logiciels existants. **Rien n’est branché pour l’instant** : aucun identifiant à saisir.

## Fichier d’interface

Section `Fichier d’interface`. C’est le fichier local qui mémorise la fenêtre, le compagnon, l’accueil et quelques largeurs de tableaux. Les équipes peuvent le **partager** pour aligner l’affichage.

Dans l’usage courant, les sections ci-dessus suffisent. N’éditez ce fichier que si on vous a transmis un modèle, puis `Enregistrer`. Une syntaxe incorrecte affiche `JSON invalide` ou `Le fichier d’interface doit être un objet JSON.`

## Se déconnecter et réinitialiser

Si le fichier d’interface a été modifié sans être enregistré, `Se déconnecter` demande confirmation : `Les modifications non enregistrées seront perdues.`

`Réinitialiser` demande : `Vous serez déconnecté et l’application va recharger. Cette action est immédiate.` Tout l’affichage local revient à l’état d’usine. Les comptes sur le serveur ne sont pas touchés.

## Bonnes pratiques

- **Gardez l’URL du serveur sous la main** pour les nouveaux postes ; l’e-mail suffit ensuite.
- **Mettez un nom d’usage et une photo** : les mentions et les historiques deviennent lisibles d’un coup d’œil.
- **Ne partagez pas votre mot de passe.** Un administrateur en crée un nouveau si besoin.
- **Laissez le fichier d’interface tranquille** sauf consigne d’équipe.

## Si quelque chose ne va pas

| Situation                                 | Que faire                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `Impossible de joindre ce serveur.`       | Vérifiez l’URL, le réseau, et que l’instance est allumée.                 |
| `Email ou mot de passe incorrect.`        | Demandez un nouveau mot de passe à un administrateur.                     |
| `Ce nom est réservé à…`                   | Choisissez un autre nom d’affichage.                                      |
| La photo d’avatar est refusée             | Copiez le fichier en local (pas seulement dans le cloud), puis réessayez. |
| `Impossible de réinitialiser. Réessayez.` | Relancez l’application, puis `Réinitialiser` à nouveau.                   |
