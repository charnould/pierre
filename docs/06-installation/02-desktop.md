# Paramétrage du bureau

Après connexion, l’application lit le paramétrage du serveur (`GET /desktop/setup`). Les modèles Word passent par la même route, authentifiée.

On ne modifie pas un dossier sur le serveur. On ouvre `Administration`, puis la porte concernée.

`external_application`, s’il est présent dans le JSON des réclamations, ouvre une cible déjà connue du poste. Absent, le module n’ouvre rien en dehors de PIERRE.
