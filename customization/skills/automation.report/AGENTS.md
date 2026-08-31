# Consignes de mise en forme et de mise en fond — rapports d’automations

Not a mechanical design system: **formatting rules** (HTML/CSS/ECharts primitives) plus **substance rules** (what to say, how deep, how to sequence findings). Open `example.html` — living doc of both.

## Files

| File                    | Role                            |
| ----------------------- | ------------------------------- |
| `pierre-report.css`     | **Only** stylesheet (forme)     |
| `pierre-report-boot.js` | Mounts `[data-echarts]` (forme) |
| `example.html`          | Living consignes — forme + fond |
| `CONTRACT.md`           | Machine-readable contract       |

Shell (runtime, not LLM): CSS + ECharts + boot are **bundled locally / inlined** with the app. LLM emits only the `<article class="report">…</article>` body — never remote `<script>` / `<link>`.

## Hard rules

1. **Semantic HTML only — absolute.** The LLM emits markup, never CSS. Spine = semantic tags (`h1`–`h6`, `p`, `ul`/`ol`, `table`, `strong`, `em`, `code`, `blockquote`, `span`, …). **No** `<style>`, **no** `style=""`, **no** Tailwind, **no** invented class names. Classes are a **closed allowlist** (below) — use a class only when a primitive requires it; otherwise bare semantics. Inventing a class or any CSS = invalid report. No exceptions.
2. **Zero network** — generated report is fully self-contained. No CDN, no `fetch`, no external fonts/scripts/images/iframes. Chart data lives as inline JSON in `data-option`. Offline-first.
3. **One CSS** — `pierre-report.css` (shipped by the shell only). LLM never authors stylesheets.
4. **Body = Lora** on white (`#ffffff`), ~16px / `line-height: 1.45`, measure-capped prose. Headings = Manrope. Charts sit in light-gray cards (`color-mix(ink 4%, white)`) — Observable-style editorial, not a dashboard.
5. **Charts = ECharts only**, and **always inside `.card`**.
6. **Exactly two chart layouts**
   - **1×1** — a single `.card` (one chart per row, full width).
   - **2×1** — `.charts-pair` with **exactly two** `.card` children (two charts per row). Never 1 or 3+ inside a pair.
7. **Headings `h1`–`h6`**. `h1` = report document title (quiet visually, but numbered `1.` on the line above, same size, left-aligned). Optional immediate `h2` = unnumbered deck. Section `h2`+ → `1.1` / `1.1.1` / … on the **line above**, same size as the title — do **not** write the numbers in the text. Always put prose under each heading. Card titles are not numbered.
8. **No table of contents**, no sidebar, no page chrome.
9. **Prose first** — every card is introduced by at least one sentence.
10. **Locale FR**. No emoji in headings. No dark mode.

## Generation mindset (mise en fond)

Forme is closed; **fond** is editorial work — not a military checklist and not “apply the design system.”

- **Answer the question brilliantly — length is not a score.** This prompt is forme + fond, not a race to fill pages. A short report that decides beats an encyclopedia that dilutes. Long is legitimate only when every section advances the answer — never to look dense, expert, or to exhaust the primitive catalogue.
- **Find the real question** (often sharper than the brief) and answer it. Everything else is secondary. One strong claim &gt; ten digressions. Proof serves the claim, not the reverse.
- **Success criterion:** a hurried reader gets the answer in a minute; a demanding reader finds the proof just below. Not the opposite. Not more.
- **Improve the brief.** The user’s ambition / prompt is often imperfect (vague, incomplete, too broad). Extrapolate, infer the real intent, tighten it — then deliver the best report those primitives allow, not a literal dump of the request.
- **Compose, don’t fill a form.** Obey the allowlist; decide length, depth, chart density, and finding order yourself.
- **Every block must earn its place.** If a heading, card, callout, or quote doesn’t carry a claim, cut it.
- **Short and complex are both valid.** Three paragraphs + one 1×1 chart can be enough; a deep outline with 2×1 pairs, tables, and tenant quotes is fine when the substance needs it.
- **Optimize presentation.** Pick 1×1 vs 2×1 for focus vs compare; pick series type for the question; use tenant quotes only when voice matters; callouts sparingly.
- **Catalogue ≠ checklist.** The type list is an allowlist, not a shopping list. Anti-pattern: dump every primitive to look complete. Fatal anti-pattern: racing for length.

## Allowlisted classes (report body — exhaustive)

`report` · `meta` · `muted` · `table-wrap` · `card` · `chart` · `charts-pair` · `note` · `tip` · `warning` · `caution` · `tenant-quote`

Doc-only (consignes page, **not** for generated reports): `palette` · `c1`…`c8`.

## Allowlisted HTML

`article` `p` `h1` `h2` `h3` `h4` `h5` `h6` `ul` `ol` `li` `strong` `em` `code` `pre` `a` `blockquote` `footer` `table` `thead` `tbody` `tr` `th` `td` `div` `hr`

Forbidden: `style` `script` `link` `iframe` `form` `svg` `img` `button` `input` `figure`/`figcaption` (use card titles), arbitrary classes.

## Chart markup

### 1×1 — one card per row

```html
<div class="card">
  <div
    class="chart"
    data-echarts
    data-option='{"title":{"text":"…","subtext":"…"},"legend":{"data":["A","B"]},"series":[{"type":"line","name":"A","data":[…]},{"type":"line","name":"B","data":[…]}]}'
  ></div>
</div>
```

### 2×1 — two cards per row (max)

```html
<div class="charts-pair">
  <div class="card">
    <div class="chart" data-echarts data-option='{"title":{"text":"Left","subtext":"…"},…}'></div>
  </div>
  <div class="card">
    <div class="chart" data-echarts data-option='{"title":{"text":"Right","subtext":"…"},…}'></div>
  </div>
</div>
```

- JSON in `data-option` (single-quoted attr, double quotes in JSON).
- **Palette** (boot-owned, do not override `color`): `#003f5c` · `#31497e` · `#674f95` · `#a14e9a` · `#d44c8d` · `#f9596f` · `#ff7a47` · `#ffa600`
- **Title / subtitle / legend**: ECharts `title.text`, `title.subtext`, `series[].name` (legend auto if ≥2 named series). Boot styles Manrope + spacing — don’t re-skin.
- **Allowlisted series / charts only:** `line` · `bar` · `pie` · `scatter` · `radar` · `heatmap` · `graph` · `tree` · `treemap` · `sunburst` · `parallel` · `sankey` · `gauge` · `themeRiver` · `calendar` · `chord` (`graph` + `layout: "circular"`).
- No 3D / GL / geo `map`.

## Callouts

| Class     | Use                       |
| --------- | ------------------------- |
| `note`    | Context / method / source |
| `tip`     | Actionable recommendation |
| `warning` | Caveat                    |
| `caution` | Urgent risk only          |

## Tenant quote

Quiet inset (alt background). Not a callout — no colored rail, no label.

```html
<blockquote class="tenant-quote">
  <p>…</p>
  <footer>Locataire · agence · réf.</footer>
</blockquote>
```

Do not wrap tenant speech in `note` / `tip` / etc.
