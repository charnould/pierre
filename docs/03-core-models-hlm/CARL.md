##### [PIERRE](../index.md) ∕ [CORE MODELS HLM](index.md) ∕ CARL

# CARL

CARL qualifie en 50 millisecondes le message d’un locataire ou candidat HLM parmi près de 300 motifs possibles. Il ne répond pas : il qualifie, pour simplifier les traitements ultérieurs, humains, automatisés et agentiques.

CARL est le premier né de « **Core Models HLM** » : une [famille](index.md) de modèles de langage open-weight, auto-hébergeables, hyper-spécialisés, frugaux et souverains, conçus pour les besoins opérationnels des bailleurs sociaux et du mouvement HLM.

La taxonomie et les données d’entraînement ont été enrichies grâce à la contribution de [Grand Dijon Habitat](http://granddijonhabitat.fr/). CARL est un hommage à [Carl von Linné](https://fr.wikipedia.org/wiki/Carl_von_Linn%C3%A9), le « grand nomenclateur », qui a posé les bases de la nomenclature binominale moderne.

Vous souhaitez proposer une amélioration à la taxonomie, ou mettre à disposition des messages de locataires ou candidats pour améliorer CARL ? [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org)

<!-- carl -->

## Présentation

### Synthèse

| Version      | CARL-1.0.0 (2026-10-10)                              |
| ------------ | ---------------------------------------------------- |
| Architecture | ModernBERT / typed-decisions                         |
| Weights      | ONNX · FP32 · ~550 Mb (approx. 136M parameters)      |
| Training     | Synthetic + Grand Dijon Habitat's real-world dataset |

### Exemple de sortie

```json
{
  "domaine": "technique",
  "sous_domaine": "menuiserie",
  "motif": "volet_defectueux",
  "integrite_physique": "intacte",
  "lieu": "logement",
  "obligation_reglementaire": "bailleur",
  "ton": "neutre"
}
```

## Comment utiliser CARL ?

1. **En utilisant PIERRE :** CARL est utilisé pour qualifier automatiquement, en quasi-temps réel, les messages des locataires et candidats HLM chargés dans le module « Réclamations ». Cette qualification « nouvelle génération » autorise de nombreux usages, humains, automatisés et agentiques (_présentation à venir_).
2. **En expérimentant :** [télécharger CARL](https://github.com/charnould/pierre/releases) (`model.zip` de la dernière release `CARL-*`), dézipper le dossier et suivre les instructions.
3. **En l'intégrant dans un applicatif :** les poids de CARL sont disponibles sous license [AGPL-3.0](https://github.com/charnould/pierre/blob/master/LICENSE.md) pour l'expérimentation, l’évaluation et l’usage exclusivement et uniquement interne des bailleurs sociaux. Toute utilisation commerciale – par API ou intégration dans un logiciel commercial notamment dans un ERP – nécessite une licence commerciale accordée par [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org).

## Taxonomie

CARL couvre l’ensemble des principales sollicitations adressées par les locataires et candidats aux bailleurs sociaux : **incidents et demandes techniques dans le logement et les parties communes, démarches administratives et liées au bail, troubles de voisinage et tranquillité résidentielle, situations d’assistance ou de vulnérabilité**. Il les qualifie selon **leur nature et leur niveau de précision**, et ajoute des dimensions transversales relatives à **l’intégrité physique, au lieu concerné, à l’obligation du bailleur ou du locataire et au ton du message**.

Un message produit une seule qualification. Si le message contient plusieurs demandes distinctes, c'est la plus aiguë qui est retenue.

Le délai de résolution, l’urgence opérationnelle et le service destinataire ne font pas partie de la taxonomie. Ils dépendent de l’organisation et de la politique de chaque bailleur social.

```yaml
integrite_physique:
  - intacte
  - menacee
  - atteinte
  - sans_objet
lieu:
  - logement
  - annexe
  - parties_communes
  - toit_facade
  - abords
  - chez_voisin
  - plusieurs_logements
  - indetermine
  - sans_objet
obligation_reglementaire:
  - bailleur
  - locataire
  - indeterminee
  - sans_objet
ton:
  - neutre
  - insatisfait
  - agressif
domaine:
  technique:
    eau:
      - fuite_source_indeterminee
      - canalisation_fuite
      - compteur_fuite
      - ballon_fuite
      - compteur_defectueux
      - compteur_releve
      - coupure
      - pression_insuffisante
      - eau_chaude_absente
      - eau_chaude_temperature
      - eau_chaude_lente
      - qualite_anormale
      - autre
    assainissement:
      - canalisation_bouchee
      - refoulement
      - pompe_relevage_panne
      - autre
    gaz:
      - fuite
      - coupure
      - pression_insuffisante
      - compteur_defectueux
      - compteur_releve
      - robinet_flexible_defectueux
      - autre
    chauffage:
      - panne
      - insuffisant
      - exces
      - bruit
      - equipement_fuite_eau
      - autre
    electricite:
      - coupure
      - disjonction
      - luminaire_defectueux
      - prise_interrupteur_defectueux
      - tableau_defectueux
      - compteur_defectueux
      - compteur_releve
      - fil_dangereux
      - autre
    air:
      - vmc_panne
      - vmc_bruit
      - humidite
      - moisissure
      - odeur
      - surchauffe
      - autre
    alarme:
      - declenchee
      - defectueuse
      - autre
    television:
      - reception_defectueuse
      - autre
    sanitaires:
      - wc_bouche
      - wc_refoule
      - wc_chasse_defectueuse
      - wc_chasse_coule
      - wc_fuite
      - wc_casse
      - wc_autre
      - robinet_fuite
      - robinet_defectueux
      - douche_baignoire_bouchee
      - douche_baignoire_fuite
      - douche_baignoire_defectueuse
      - lavabo_evier_bouche
      - lavabo_evier_fuite
      - lavabo_evier_defectueux
      - vanne_arret_defectueuse
      - autre
    menuiserie:
      - fenetre_defectueuse
      - volet_defectueux
      - porte_interieure_defectueuse
      - vitrage_casse
      - autre
    serrurerie:
      - porte_logement_bloquee
      - porte_logement_fermeture_defectueuse
      - porte_logement_endommagee
      - cylindre_defectueux
      - cle_perdue_cassee
      - autre
    structure:
      - fissure
      - balcon_coursive_degrade
      - escalier_degrade
      - garde_corps_defectueux
      - autre
    enveloppe:
      - toiture_infiltration
      - toiture_degradee
      - facade_infiltration
      - facade_degradee
      - menuiserie_exterieure_infiltration
      - gouttiere_defectueuse
      - autre
    revetements:
      - mur_plafond_degrade
      - sol_degrade
      - isolant_degrade
      - autre
    ascenseur:
      - panne
      - porte_defectueuse
      - bruit
      - personne_enfermee
      - accident
      - autre
    acces:
      - badge_remplacement
      - badge_activation
      - telecommande_remplacement
      - interphone_panne
      - boite_lettres_defectueuse
      - porte_commune_defectueuse
      - porte_commune_degondee
      - porte_technique_defectueuse
      - porte_annexe_defectueuse
      - portail_barriere_bloque
      - portail_barriere_defectueux
      - ferme_porte_defectueux
      - autre
    proprete:
      - salissure
      - dechets
      - encombrants
      - odeur
      - autre
    nuisibles:
      - infestation_punaises
      - infestation_blattes
      - presence_rongeurs
      - nid_guepes_frelons
      - nid_oiseaux
      - presence_indeterminee
      - autre
    exterieurs:
      - arbre_dangereux
      - espaces_verts_entretien
      - voirie_degradee
      - neige_verglas
      - aire_jeux_degradee
      - stationnement_genant
      - vehicule_abandonne
      - mobilier_degrade
      - cloture_degradee
      - autre
    securite_incendie:
      - incendie_explosion
      - detecteur_declenche
      - detecteur_defectueux
      - alarme_declenchee
      - alarme_defectueuse
      - desenfumage_defectueux
      - extincteur_absent_vide
      - eclairage_secours_defectueux
      - porte_coupe_feu_defectueuse
      - colonne_seche_defectueuse
      - autre
    sinistre:
      - degat_eaux
      - apres_incendie
      - remise_en_etat
      - autre
    surete:
      - effraction
      - vandalisme
      - vol
      - alarme_intrusion_declenchee
      - alarme_intrusion_defectueuse
      - autre
    autre:
      - autre
  administratif:
    candidature:
      - demande
      - pieces
      - suivi
      - autre
    bail:
      - copie
      - clause
      - avenant
      - titulaire
      - autre
    entree_sortie:
      - etat_lieux_entree
      - remise_cles
      - preavis
      - etat_lieux_sortie
      - indemnites_locatives
      - depot_garantie
      - deces
      - logement_abandonne
      - autre
    loyer:
      - quittance
      - avis_echeance
      - incomprehension
      - charges
      - sls
      - aides_logement
      - difficulte
      - mode_paiement
      - imputation
      - facturation
      - autre
    assurance:
      - attestation
      - autre
    dossier_sinistre:
      - declaration
      - expertise
      - prise_en_charge
      - autre
    documents:
      - demande
      - transmission
      - autre
    mutation:
      - demande
      - logement_inadapte
      - suivi
      - autre
    stationnement:
      - demande
      - gestion
      - autre
    travaux_locataire:
      - autorisation
      - adaptation
      - fibre
      - autre
    travaux_bailleur:
      - information
      - programme
      - suivi
      - autre
    diagnostic:
      - document
      - rendez_vous
      - autre
    contentieux:
      - procedure
      - autre
    indemnisation:
      - reduction_loyer
      - compensation
      - autre
    rendez_vous:
      - situation_non_precisee
      - technique_non_precise
      - autre
    accession:
      - achat
      - suivi
      - autre
    information:
      - question
      - autre
    relation:
      - agent
      - prestataire
      - autre
    autre:
      - autre
  tranquillite_residentielle:
    bruit:
      - musique
      - travaux
      - animal
      - tapage
      - autre
    conflit:
      - dispute
      - harcelement
      - menaces
      - violence
      - autre
    nuisance:
      - odeurs
      - fumee
      - jets
      - salete
      - encombrement
      - animal
      - autre
    occupation:
      - squat
      - sous_location
      - defaut_usage
      - autre
    securite:
      - intrusion
      - trafic
      - arme
      - autre
    autre:
      - autre
  assistance:
    secours:
      - detresse
      - deces_suspect
      - autre
    vulnerabilite:
      - isolement
      - information_preoccupante
      - autre
    aide:
      - quotidien
      - autre
    animal:
      - enferme
      - coince
      - errant
      - autre
    autre:
      - autre
  inexploitable: {}
  hors_perimetre: {}
```

## Licence

CARL est un modèle fine-tuné à partir de [alphaedge-ai/mmBERT-base-fra-32768](https://huggingface.co/alphaedge-ai/mmBERT-base-fra-32768) (MIT).

La taxonomie de CARL est distribuée sous [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Les poids de CARL sont disponibles sous [AGPL-3.0](https://github.com/charnould/pierre/blob/master/LICENSE.md) pour l'expérimentation, l'évaluation et l'usage interne des bailleurs sociaux. **Toute utilisation commerciale ou intégration dans un logiciel commercial, notamment dans un ERP ou via une API, nécessite une licence commerciale distincte accordée par [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org).**

Copyright (c) 2026-aujourd'hui, Charles-Henri Arnould/BECKREL et les contributeurs.
