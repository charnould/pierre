export const DEMO_AUTOMATION_REPORT_HTML = `
<article class="report">
  <h1>Brief d’astreinte — points chauds et chantiers</h1>
  <h2>Deux signaux concentrent le risque ce vendredi soir : une panne électrique à Rosa Parks et un ascenseur immobilisé à Oscar Wilde.</h2>

  <div class="meta">
    <span><strong>Périmètre</strong> Dijon Métropole Sud</span>
    <span><strong>Arrêté au</strong> 4 septembre 2026 · 17 h 30</span>
    <span><strong>Sources</strong> Réclamations, patrimoine, interventions</span>
  </div>

  <div class="note">
    <p><strong>Données fictives de démonstration.</strong> Les résidences, tickets, volumes, contacts et interventions de ce rapport sont inventés.</p>
  </div>

  <h2>Décision en une minute</h2>
  <p>
    La soirée est maîtrisable à condition de traiter <strong>deux foyers avant 19 h</strong>.
    À Rosa Parks, onze signalements concordants décrivent une coupure limitée au bâtiment B :
    le mainteneur électrique doit être engagé sans attendre. À Oscar Wilde, l’ascenseur unique
    de l’entrée C est à l’arrêt ; la présence de quatre locataires à mobilité réduite impose une
    remise en service prioritaire ou une solution d’assistance.
  </p>
  <div class="caution">
    <p>
      <strong>Priorité immédiate :</strong> sécuriser Rosa Parks bâtiment B, puis confirmer avant
      18 h 30 la prise en charge de l’ascenseur Oscar Wilde. Ces deux incidents représentent
      24 des 36 sollicitations reçues depuis 15 h 30.
    </p>
  </div>
  <p>
    Les autres demandes sont diffuses et sans indice d’incident collectif. Deux tickets peuvent
    être expliqués par des chantiers déjà planifiés, ce qui permet d’éviter des déplacements
    inutiles et de réserver l’astreinte aux situations de sécurité.
  </p>

  <p>La concentration des sollicitations fait nettement ressortir les deux résidences à traiter.</p>
  <div class="card">
    <div
      class="chart"
      data-echarts
      data-option='{"title":{"text":"Sollicitations reçues depuis 15 h 30","subtext":"36 appels et messages · données fictives"},"tooltip":{"trigger":"axis"},"grid":{"left":4,"right":12},"xAxis":{"type":"value","minInterval":1},"yAxis":{"type":"category","data":["Autres résidences","Les Tilleuls","Parc Bel Air","Oscar Wilde · entrée C","Rosa Parks · bât. B"]},"series":[{"type":"bar","name":"Sollicitations","data":[5,3,4,9,15],"barMaxWidth":22,"label":{"show":true,"position":"right"}}]}'
    ></div>
  </div>

  <h2>Incidents collectifs à engager</h2>
  <p>
    Le rapprochement des appels, des équipements et des événements techniques confirme deux
    incidents distincts. Aucun défaut réseau de quartier n’est signalé par les opérateurs.
  </p>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Résidence</th>
          <th>Signal</th>
          <th>Éléments concordants</th>
          <th>Décision</th>
          <th>Échéance</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Rosa Parks · bâtiment B</strong></td>
          <td>Coupure électrique</td>
          <td>15 sollicitations · parties communes et logements · autres bâtiments alimentés</td>
          <td>Déclencher Élec Bourgogne et informer les résidents</td>
          <td>18 h 15</td>
        </tr>
        <tr>
          <td><strong>Oscar Wilde · entrée C</strong></td>
          <td>Ascenseur immobilisé</td>
          <td>9 sollicitations · cabine vide au niveau 4 · 4 résidents fragiles identifiés</td>
          <td>Intervention Ascenseurs 21 et rappel des personnes fragiles</td>
          <td>18 h 30</td>
        </tr>
      </tbody>
    </table>
  </div>

  <blockquote class="tenant-quote">
    <p>Tout le bâtiment B est dans le noir, mais l’éclairage fonctionne encore dans le hall d’à côté.</p>
    <footer>Signalement fictif · Rosa Parks · ticket DEMO-88431</footer>
  </blockquote>

  <h2>Chantiers en cours et déplacements évitables</h2>
  <p>
    Trois interventions planifiées restent actives ce week-end. Deux réclamations récentes
    correspondent exactement à leur périmètre : elles appellent une information ciblée, pas
    l’envoi immédiat d’un technicien.
  </p>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Résidence</th>
          <th>Intervention</th>
          <th>Impact annoncé</th>
          <th>Ticket rapproché</th>
          <th>Action recommandée</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Les Tilleuls</strong></td>
          <td>Remplacement de la colonne d’eau froide</td>
          <td>Coupures ponctuelles aux étages 3 à 6 jusqu’à 18 h</td>
          <td>DEMO-88418 · absence d’eau au 4e</td>
          <td>Informer et rappeler à 18 h 15 avant déplacement</td>
        </tr>
        <tr>
          <td><strong>Parc Bel Air</strong></td>
          <td>Réglage de la sous-station de chauffage</td>
          <td>Baisse temporaire de température en soirée</td>
          <td>DEMO-88407 · radiateurs tièdes</td>
          <td>Confirmer la fin d’intervention auprès de CVC Dijon</td>
        </tr>
        <tr>
          <td><strong>Résidence du Parc</strong></td>
          <td>Étanchéité de la toiture-terrasse</td>
          <td>Aucun impact intérieur prévu</td>
          <td>Aucun</td>
          <td>Surveillance simple après les pluies annoncées</td>
        </tr>
      </tbody>
    </table>
  </div>

  <p>
    Après rapprochement, un tiers des dossiers appelle une vérification à distance avant toute
    mobilisation terrain.
  </p>
  <div class="card">
    <div
      class="chart"
      data-echarts
      data-option='{"title":{"text":"Orientation des 12 dossiers ouverts","subtext":"Décision proposée pour l’astreinte · données fictives"},"tooltip":{"trigger":"item"},"legend":{"bottom":0},"series":[{"type":"pie","name":"Dossiers","radius":["42%","68%"],"center":["50%","46%"],"label":{"formatter":"{b}\\n{c}"},"data":[{"name":"Intervention immédiate","value":3},{"name":"Vérification à distance","value":4},{"name":"Traitement ouvré","value":3},{"name":"Information chantier","value":2}]}]}'
    ></div>
  </div>

  <h2>Plan d’action pour la relève</h2>
  <p>
    L’objectif est de réduire le risque humain avant 19 h, puis de maintenir une surveillance
    légère jusqu’à la relève du samedi matin.
  </p>
  <ol>
    <li>
      <strong>17 h 45 — Rosa Parks :</strong> confirmer l’absence de danger dans les parties
      communes, déclencher Élec Bourgogne et diffuser un message aux occupants du bâtiment B.
    </li>
    <li>
      <strong>18 h — Oscar Wilde :</strong> obtenir l’heure d’arrivée du technicien, puis appeler
      les quatre résidents fragiles avec le gardien.
    </li>
    <li>
      <strong>18 h 15 — Les Tilleuls et Parc Bel Air :</strong> vérifier la fin des chantiers avant
      de décider d’un déplacement.
    </li>
    <li>
      <strong>20 h puis 23 h :</strong> contrôler les nouveaux volumes. Escalader si une résidence
      dépasse cinq sollicitations concordantes sur trente minutes.
    </li>
    <li>
      <strong>Samedi 7 h 30 :</strong> transmettre les tickets non soldés, les horaires
      d’intervention confirmés et les rappels locataires restant à effectuer.
    </li>
  </ol>
  <div class="tip">
    <p>
      Tenir un interlocuteur unique par résidence et consigner chaque rappel dans le ticket
      d’origine. Cela évite les doublons et rend la relève immédiatement exploitable.
    </p>
  </div>

  <h2>Contacts de démonstration</h2>
  <p>Ces coordonnées sont volontairement neutralisées et ne correspondent à aucun prestataire réel.</p>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Rôle</th>
          <th>Interlocuteur</th>
          <th>Coordonnée fictive</th>
          <th>Disponibilité</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Électricité</td>
          <td>Élec Bourgogne Démo</td>
          <td>01 00 00 00 41</td>
          <td>24 h / 24</td>
        </tr>
        <tr>
          <td>Ascenseurs</td>
          <td>Ascenseurs 21 Démo</td>
          <td>01 00 00 00 42</td>
          <td>Intervention sous 90 min</td>
        </tr>
        <tr>
          <td>Relève interne</td>
          <td>Camille Martin · profil fictif</td>
          <td>demo-astreinte@example.invalid</td>
          <td>Samedi à 7 h 30</td>
        </tr>
      </tbody>
    </table>
  </div>

  <hr>
  <p class="muted">
    Rapport statique généré pour une démonstration de Pierre. Toutes les données présentées sont
    inventées et ne doivent déclencher aucune action réelle.
  </p>
</article>
`
