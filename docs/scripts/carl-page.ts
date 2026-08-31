export type Bench = {
  name: string
  api: string
  placeholder: string
  groupes: readonly {
    domaine: string
    exemples: readonly (readonly [string, string])[]
  }[]
}

const CARL: Bench = {
  name: 'Sélectionner un exemple ou saisir un message',
  api: 'http://localhost:3000/api/models/carl',
  placeholder: 'Écrire un message…',
  groupes: [
    {
      domaine: 'Technique',
      exemples: [
        ['Fuite', "Fuite d'eau dans la salle de bain, au lavabo, en filet depuis hier."],
        ['Chauffage', 'Plus de chauffage depuis hier soir, les radiateurs sont froids.'],
        ['Courant', "Plus de courant dans tout l'appartement depuis ce matin."],
        ['Ascenseur', "L'ascenseur est en panne depuis ce matin."],
        ['Moisissure', 'Il y a des taches noires de moisissure dans la chambre.'],
        ['Hall', 'Les parties communes sont sales, le hall est plein de sacs.'],
        ['Volet', 'Le volet de la chambre ne remonte plus.'],
        ['Porte', 'Vous êtes des incapables, ma porte ne ferme plus.']
      ]
    },
    {
      domaine: 'Administratif',
      exemples: [
        ['Quittance', "Pouvez-vous m'envoyer ma quittance de loyer ?"],
        ['Préavis', 'Je souhaite donner mon préavis pour quitter le logement.'],
        ['Candidature', 'Où en est ma demande de logement ?'],
        ['Assurance', "Je vous transmets mon attestation d'assurance habitation."]
      ]
    },
    {
      domaine: 'Tranquillité',
      exemples: [
        ['Musique', "Les voisins ont mis la musique jusqu'à minuit."],
        ['Harcèlement', "Mon voisin me harcèle et m'insulte dans le hall."],
        ['Squat', "Le logement d'à côté est squatté depuis une semaine."]
      ]
    },
    {
      domaine: 'Assistance',
      exemples: [
        ['Détresse', "Je suis tombé dans la salle de bain, je n'arrive pas à me relever."],
        ['Isolement', 'Ma voisine âgée ne répond plus depuis plusieurs jours.'],
        ['Animal', "Mon chat est enfermé sur le balcon, je n'arrive pas à le récupérer."]
      ]
    }
  ]
}

export const CARL_CSS = `
    body.has-bench .article {
      overflow-wrap: break-word;
    }
    body.has-bench .article .typeset-scroll {
      max-width: 100%;
      overflow-x: auto;
      margin: 0 0 16px;
    }
    body.has-bench .article table {
      width: 100%;
      border-collapse: collapse;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      font-size: 14px;
      line-height: 20px;
    }
    body.has-bench .article th,
    body.has-bench .article td {
      font-weight: 400;
      text-align: left;
      vertical-align: top;
      padding: 8px 16px 8px 0;
      border-bottom: 1px solid #ececec;
    }
    body.has-bench .article tr > :first-child {
      font-weight: 700;
      width: 11rem;
    }
    body.has-bench .article :not(pre) > code {
      position: relative;
      top: -0.05em;
    }
    body.has-bench .article blockquote {
      margin: 0 0 16px;
      padding-left: 14px;
      border-left: 2px solid #111;
    }
    .banc {
      position: relative;
      box-sizing: border-box;
      margin: 44px 2px 52px;
      padding: 28px 24px 22px;
      overflow: visible;
      background: #fff;
      border: 1px solid #e6e6e6;
      border-radius: 8px;
      box-shadow:
        0 1px 2px rgb(17 17 17 / 0.06),
        0 12px 40px rgb(17 17 17 / 0.12);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
      line-height: 18px;
      color: #111;
    }
    @media (prefers-reduced-motion: reduce) {
      .banc {
        transform: none;
      }
    }
    .banc .marque {
      position: absolute;
      top: -0.72rem;
      left: -0.65rem;
      z-index: 1;
      margin: 0;
      padding: 0.15rem 0.55rem 0.08rem;
      background: #ffe500;
      color: #111;
      font-family: Knewave, cursive;
      font-size: 1.05rem;
      font-weight: 400;
      font-synthesis: none;
      letter-spacing: 0.01em;
      line-height: 1.15;
      text-transform: uppercase;
      pointer-events: none;
    }
    .banc .exemples {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin: 4px 0 22px;
    }
    .banc .exemples button {
      height: 28px;
      padding: 0 10px;
      border: 1px solid #d4d4d4;
      border-radius: 4px;
      background: #fff;
      color: #111;
      font: inherit;
      cursor: pointer;
    }
    .banc .exemples button:hover {
      border-color: #111;
      background: #f6f6f6;
    }
    .banc .exemples button:focus-visible {
      outline: 1px solid #111;
      outline-offset: 2px;
    }
    .banc .exemples button[aria-pressed='true'] {
      border-color: #111;
      background: #ffe500;
    }
    .banc .exemples button[aria-pressed='true']:hover {
      background: #ffe500;
    }
    .banc .paire {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      align-items: start;
    }
    .banc label,
    .banc .entete {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 700;
      line-height: 18px;
    }
    .banc .entete span:last-child {
      margin-left: auto;
      color: #666;
      font-weight: 400;
      font-variant-numeric: tabular-nums;
    }
    .banc textarea,
    .banc .cadre {
      box-sizing: border-box;
      width: 100%;
      min-height: 8rem;
      margin: 0;
      padding: 12px 14px;
      border: 1px solid #d4d4d4;
      border-radius: 6px;
      background: #fff;
      color: #111;
    }
    .banc textarea {
      display: block;
      font: inherit;
      resize: vertical;
    }
    .banc textarea::placeholder {
      color: #8a8a8a;
    }
    .banc textarea:focus {
      outline: none;
      border-color: #111;
    }
    .banc .attente {
      margin: 0;
      color: #666;
    }
    .banc .envoyer {
      height: 32px;
      margin-top: 12px;
      padding: 0 14px;
      border: 0;
      border-radius: 6px;
      background: #111;
      color: #fff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .banc .envoyer:disabled {
      opacity: 0.45;
      cursor: progress;
    }
    body.has-bench .banc pre.cadre {
      margin: 0;
      overflow: auto;
      background: #fff;
      font: inherit;
      white-space: pre-wrap;
    }
    @media (max-width: 40rem) {
      .banc {
        margin-inline: 0;
        padding: 26px 16px 18px;
      }
      .banc .paire {
        grid-template-columns: 1fr;
      }
    }
`

export function benchHtml(bench: Bench = CARL): string {
  const slug = bench.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const texteId = `texte-${slug}`
  const exemples = bench.groupes
    .flatMap((groupe) =>
      groupe.exemples.map(
        ([label, texte]) =>
          `<button type="button" data-texte="${Bun.escapeHTML(texte)}" aria-pressed="false">${Bun.escapeHTML(label)}</button>`
      )
    )
    .join('')
  const origine = new URL(bench.api).origin
  return `<aside class="banc">
    <p class="marque">${Bun.escapeHTML(bench.name)}</p>
    <div class="exemples">${exemples}</div>
    <div class="paire">
      <form id="classer-${slug}">
        <label for="${texteId}">Message</label>
        <textarea id="${texteId}" name="texte" placeholder="${Bun.escapeHTML(bench.placeholder)}" autocomplete="off"></textarea>
        <button class="envoyer" type="submit">Qualifier</button>
      </form>
      <div class="sortie">
        <div class="entete">
          <span>Résultat</span>
          <span id="duree-${slug}" aria-live="polite"></span>
        </div>
        <p class="cadre attente" id="attente-${slug}">Le JSON apparaît ici.</p>
        <p class="cadre" id="erreur-${slug}" hidden aria-live="polite"></p>
        <pre class="cadre" id="resultat-${slug}" hidden aria-live="polite"></pre>
      </div>
    </div>
    <script>
      const banc = document.currentScript.closest('.banc')
      const API = ${JSON.stringify(bench.api)}
      const ORIGINE = ${JSON.stringify(origine)}
      const PLACEHOLDER = ${JSON.stringify(bench.placeholder)}
      const form = banc.querySelector('form')
      const zone = banc.querySelector('textarea')
      const erreur = banc.querySelector('[id^="erreur-"]')
      const resultat = banc.querySelector('[id^="resultat-"]')
      const attente = banc.querySelector('[id^="attente-"]')
      const duree = banc.querySelector('[id^="duree-"]')
      const envoyer = form.querySelector('button[type="submit"]')
      const exemples = banc.querySelector('.exemples')

      function exempleDe(noeud) {
        return noeud && noeud.closest ? noeud.closest('[data-texte]') : null
      }

      function marquerExemples() {
        for (const bouton of banc.querySelectorAll('[data-texte]')) {
          bouton.setAttribute('aria-pressed', bouton.dataset.texte === zone.value ? 'true' : 'false')
        }
      }

      function majPlaceholder(cible) {
        zone.placeholder = cible && cible.dataset.texte ? cible.dataset.texte : PLACEHOLDER
      }

      function montrerErreur(message) {
        resultat.hidden = true
        attente.hidden = true
        duree.textContent = ''
        erreur.hidden = false
        erreur.textContent = message
      }

      function montrer(payload) {
        erreur.hidden = true
        attente.hidden = true
        resultat.hidden = false
        resultat.textContent = JSON.stringify(payload.output, null, 2)
        const ms = payload.milliseconds
        duree.textContent = ms < 1000 ? ms + ' ms' : (ms / 1000).toFixed(1).replace('.', ',') + ' s'
      }

      async function classer() {
        const texte = zone.value
        if (!texte.trim()) {
          montrerErreur('Écrivez un message, ou choisissez un exemple.')
          zone.focus()
          return
        }
        envoyer.disabled = true
        envoyer.textContent = 'Qualification…'
        form.setAttribute('aria-busy', 'true')
        try {
          const reponse = await fetch(API, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ texte })
          })
          const payload = await reponse.json().catch(() => null)
          if (!reponse.ok) {
            if (reponse.status === 503) {
              montrerErreur("Les poids ne sont pas installés. Depuis models : bun fetch.")
            } else if (!payload) {
              montrerErreur('Le serveur a répondu sans JSON.')
            } else {
              montrerErreur(payload.error && payload.error.message ? payload.error.message : 'Le classement a échoué.')
            }
            return
          }
          montrer(payload)
        } catch {
          montrerErreur('PIERRE ne répond pas sur ' + ORIGINE + '.')
        } finally {
          envoyer.disabled = false
          envoyer.textContent = 'Qualifier'
          form.removeAttribute('aria-busy')
        }
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault()
        classer()
      })
      zone.addEventListener('input', marquerExemples)
      exemples.addEventListener('mouseover', (event) => {
        const bouton = exempleDe(event.target)
        if (bouton) majPlaceholder(bouton)
      })
      exemples.addEventListener('mouseout', (event) => {
        if (!exempleDe(event.target)) return
        const vers = exempleDe(event.relatedTarget)
        if (vers) {
          majPlaceholder(vers)
          return
        }
        const actif = document.activeElement
        majPlaceholder(actif && banc.contains(actif) ? exempleDe(actif) : null)
      })
      exemples.addEventListener('focusin', (event) => {
        const bouton = exempleDe(event.target)
        if (bouton) majPlaceholder(bouton)
      })
      exemples.addEventListener('focusout', (event) => {
        if (exempleDe(event.relatedTarget)) return
        if (banc.querySelector('[data-texte]:hover')) return
        majPlaceholder(null)
      })
      for (const bouton of banc.querySelectorAll('[data-texte]')) {
        bouton.addEventListener('click', () => {
          zone.value = bouton.dataset.texte || ''
          marquerExemples()
          classer()
        })
      }
      zone.focus()
    </script>
  </aside>`
}
