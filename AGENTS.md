# Agents.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Proportional architecture

This is a French social-housing application, not a hyperscale platform.

- Assume SQLite and one server process unless the deployment model explicitly changes.
- Provider calls time out after 15 seconds; dispatch leases last 30 seconds.
- Do not add distributed ownership, coordination, or Netflix-scale machinery for hypothetical
  multi-worker races.
- Add architectural complexity only for a concrete requirement or an observed failure.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Formatting and lint

Run these from the **repo root**. `bun fmt` and oxlint rewrite files when asked to fix: check first, then fix only the files you touched. Do not format or lint-fix the whole repository.

```bash
bun fmt --check
bun fmt <files>
bun oxlint
bun oxlint --fix <files>
bun check
```

Style (single quotes, no semicolons, `printWidth` 100, `sortImports`, `sortTailwindcss`, `sortPackageJson`) lives in `bunfig.toml`. Lint rules and ignore patterns live in `.oxlintrc.jsonc` at the repo root: Oxlint anchors those patterns on the config file's directory, so the file cannot live under `config/`. Bun 1.4.4 ships `bun fmt` only: `bun lint` is still canary, so this repo keeps oxlint. Do not add a `fmt` or `lint` script — a `fmt` script hides `bun fmt`, and a `lint` script would hide `bun lint` once a stable release includes it.

```bash
bun test config/checks
bun test cli/tests
TZ=Europe/Paris bun test --cwd desktop
TZ=Europe/Paris bun test --cwd desktop --watch
bun test --cwd server --max-concurrency 1 unit
bun server/utils/update-pierre.ts
bun server/tests/live/cm-channels.ts
```

---

## Design system

Avant toute création, modification ou revue d’interface, lire `desktop/DESIGN.md` en entier. C’est la loi visuelle. Elle gagne sur un skill, un exemple shadcn, ou une habitude du code.

Pas de couleur, de radius, de typographie ou de composition inventés dans un composant. `className` place un élément. Il ne redessine pas une primitive.

Un écart s’arrête avant le code. Il devient une ligne de « Exceptions volontairement conservées » dans `desktop/DESIGN.md` : ce qui s’écarte, pourquoi le contrat ne suffit pas, ce qui a été refusé. Pas de `className` silencieux. Aucune règle visuelle ne s’écrit dans `AGENTS.md`.

## shadcn

Avant d’ajouter, composer ou revoir une interface, lire les skills `shadcn/ui` et `shadcn/improve`. S’ils sont absents, les installer depuis la racine :

```bash
bunx --bun skills add shadcn/ui
bunx --bun skills add shadcn/improve
bunx --bun skills add meodai/skill.color-expert
```

`shadcn/ui` fixe la composition. `shadcn/improve` ramène une interface existante vers ces règles. Les deux s’appliquent. Les primitives déjà du dépôt vivent dans `desktop/src/shared/components/ui`. Le CLI qui les ajoute est `bunx --bun shadcn@latest`.

Si un skill et `desktop/DESIGN.md` divergent, le design system gagne. La divergence est l’exception documentée plus haut.

## Serveur

Le code serveur prend d’abord les API de <https://bun.com/docs> : `Bun.file`, `Bun.spawn`, `Bun.randomUUIDv7()`, `Bun.password`, Web Crypto, encodages de `Uint8Array`. Pas de `node:crypto` ni de `Buffer` quand Bun couvre le besoin. Les exceptions déjà réelles sont dans `server/AGENTS.md`.
