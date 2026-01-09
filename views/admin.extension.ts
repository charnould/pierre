import { html } from 'hono/html'
import { Skill } from '../utils/_schema'

export const view = (skills: Skill[]) => {
  return html`<!doctype html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <script src="https://unpkg.com/@hotwired/turbo@8.0.12/dist/turbo.es2017-umd.js"></script>
        <link rel="icon" href="../assets/default/system.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://rsms.me" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link rel="stylesheet" href="../assets/core/dist/css/style.1768470180179.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk&display=swap"
          rel="stylesheet"
        />
        <title>PIERRE — Console</title>
      </head>

      <body class="mt-20 ml-20 w-4xl min-w-4xl bg-stone-50">
        <a href="/a" class="mb-6 block w-fit rounded-full bg-teal-200 px-3 py-1 pr-4 font-medium"
          >← Retour</a
        >

        <form action="/a/bridge" method="post" enctype="multipart/form-data">
          <div class="mb-10 flex flex-row items-center justify-between">
            <h1 class="font-mono text-6xl font-extrabold">Extension</h1>

            <button
              type="submit"
              class="flex cursor-pointer items-center gap-3 rounded-lg bg-linear-to-r from-blue-600 to-blue-700 px-4 py-2"
            >
              <p>
                <span class="block text-center text-base font-medium text-white">
                  Enregistrer
                </span>
                <span class="block text-center font-mono text-[11px] text-white">
                  10 skills maximum
                </span>
              </p>
            </button>
          </div>

          <p class="mb-2 max-w-2xl text-sm">
            Les capacités (ou « skills ») de
            <a
              href="https://charnould.github.io/pierre/bridge.html"
              target="_blank"
              class="cursor-pointer text-blue-600 underline decoration-1 underline-offset-3"
              >l’extension Chrome™ de PIERRE</a
            >
            sont définies ici.
          </p>
          <p class="mb-2 max-w-2xl text-sm">
            Chaque « skill » correspond à une fonctionnalité précise que l'extension PIERRE pourra
            exécuter : répondre aux troubles du voisinage, requalifier une demande imprécise,
            répondre aux questions-logements usuelles...
          </p>

          <p class="mb-2 max-w-2xl text-sm">
            Pour chaque « skill » : le <b>nom</b> est celui qui apparaîtra dans l’extension (il doit
            être simple, explicite et compréhensible par l’ensemble des équipes), le
            <b>prompt</b> (au format Markdown) décrit le rôle et le comportement de PIERRE (il
            précise comment il doit analyser la demande et quelle stratégie il doit suivre pour
            réaliser la tâche attendue).
          </p>

          <p class="mb-2 max-w-2xl text-sm">
            Une définition claire des « skills » garantit une utilisation efficace et fiable de
            l’extension par les utilisateurs. Pour ce faire, il convient d'appliquer les meilleures
            pratiques de « prompt engineering ».
          </p>

          <p class="mb-2 max-w-2xl text-sm">
            À ce jour, 10 « skills » peuvent être paramétrées au maximum.
          </p>

          <p class="mb-9 max-w-2xl text-sm">
            <span class="font-mono font-extrabold">Info/</span>
            À ne manipuler que si l'on sait ce que l'on fait. Les variables disponibles sont les
            suivantes :
            <span class="rounded-md bg-gray-200 px-1 py-px font-mono text-xs">{{{today}}}</span>
            <span class="rounded-md bg-gray-200 px-1 py-px font-mono text-xs">{{{location}}}</span>,
            <span class="rounded-md bg-gray-200 px-1 py-px font-mono text-xs"
              >{{{internal_materials}}}</span
            >,
            <span class="rounded-md bg-gray-200 px-1 py-px font-mono text-xs"
              >{{{community_materials}}}</span
            >,
            <span class="rounded-md bg-gray-200 px-1 py-px font-mono text-xs">{{{user_query}}}</span
            >, <span class="rounded-md bg-gray-200 px-1 py-px font-mono text-xs">{{{lang}}}</span>.
            Des exemples de « skills » sont/seront disponibles
            <a
              target="_blank"
              href="https://github.com/charnould/pierre/tree/master/docs/skills"
              class="cursor-pointer text-blue-600 underline decoration-1 underline-offset-3"
              >sur le site du projet PIERRE</a
            >.
          </p>

          ${skills.map(
            (skill, index) => html`
                    <h2
                class="mb-4 font-mono text-2xl font-extrabold"
              >
                Skill #${index + 1}
              </h2>
              <input type="hidden" name="skills[${index}][id]" value="${skill.id}" />
              <input
                type="text"
                name="skills[${index}][name]"
                placeholder="Nom de la « skill »"
                value="${skill.name}"
                class="my-2 block w-2xl max-w-2xl rounded border border-gray-400 p-2 font-mono outline-none"
              />
              <textarea
                name="skills[${index}][skill]"
                placeholder="${skill_placeholder}"
                class="my-2 block h-100 w-2xl max-w-2xl rounded border border-gray-400 p-2 font-mono outline-none"
              >
${skill.skill}</textarea
              >
                  `
          )}
        </form>
      </body>
    </html>`
}

const skill_placeholder = `# Core Identity & Constraints

You are **PIERRE**, an open-source multilingual AI assistant dedicated to supporting social housing applicants, tenants, and staff. Your purpose is to help people understand information related to housing, administrative processes, maintenance, and day-to-day interactions with social housing organizations. You are part of the open-data, open-community initiative available at [pierre-ia.org](https://www.pierre-ia.org).

Your role is to answer questions using **only** the provided reference materials. You do not use general knowledge, make assumptions, or invent details.

**Absolute Rule:** If information is not in your reference materials, say so directly. Do not guess.

---

# How to Answer

## 1. Ground Every Answer

- Use only chunks from the reference material
- Prioritize **Internal Materials** (marked Priority 1) over Community Materials (Priority 2)
- If a question could be answered multiple ways from different chunks, use the most authoritative source
- When multiple chunks contain partial answers, synthesize them accurately without adding interpretation

## 2. Handle Ambiguity Clearly

- If a user's question is ambiguous and different interpretations lead to different answers, ask for clarification before responding
- Define unfamiliar terms briefly using your materials
- If information is incomplete or contradictory in the materials, acknowledge both versions

## 3. Style

- Be warm, professional, and concise
- Use simple language accessible to all literacy levels
- No speculation, humor, personal opinions, or external sources
- Format with Markdown only when it genuinely improves clarity (lists for steps, bold for key terms)
- Keep answers focused and avoid repetition

## 4. Self-Check Before Responding

Ask yourself:

- [ ] Is every factual claim from my reference materials?
- [ ] Did I invent any procedures, contacts, dates, or rules?
- [ ] Does my answer directly address what was asked?
- [ ] Could a user act on this answer safely?
- [ ] Did I acknowledge ambiguity or missing context?

---

# What You Cannot Do

- Upload or open files (CSV, PDF, XLS, images, etc.) — ask the user to paste text instead
- Access external websites or real-time data
- Confirm information outside your reference materials
- Sign messages or add your name
- Provide legal, medical, or financial advice (note if the question requires professional consultation)
- Invent anything: procedures, names, phone numbers, email addresses, rules, deadlines

---

# Current Context

**Today's date:** {{{today}}}
**User's location:** {{{location}}}

## Internal Materials (Priority 1)

{{{internal_materials}}}

## Community Materials (Priority 2)

{{{community_materials}}}

---

# User Query

{{{user_query}}}

---

# Your Answer in "{{{lang}}}" (ISO 639-1 format)`
