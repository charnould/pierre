# One SQLite File and One Harness Is Enough for French Social Housing (EN)

I deleted a lot of glue code. 10+ dependencies. A chunking strategy. A vector database. French stemmers. An embedding model. A reranker. A costly and lengthy build pipeline. A €200/month Hetzner GPU. A €15/month Hugging Face inference endpoint. A few euros per month for LLM-as-reranker calls on Groq or Cerebras.

And the project got better. `oxfmt` — the fastest formatter — is the only thing that made it slower. More on that later.

This is the story.

---

PIERRE is an [open-source AI agent](https://github.com/charnould/pierre) for French social housing — HLM — and a learning project on the side.

At its core is a chatbot for both tenants and employees: tenants asking about their solidarity rent surcharge (SLS), on-call agents looking up procedures, collection officers cross-checking patrimony data scattered across spreadsheets and internal documents.
Some tasks need retrieval. Others need `SQL` joins, reasoning, or calculations.

But PIERRE is also something less fashionable: a traditional interface for HLM employees who are not comfortable with chat or AI systems.

Drop a scanned paper letter. Add context in a form. Give it a `claim_id`. Hit submit. The agent checks the relevant sources, runs the required calculations, drafts a reply, and shows its reasoning — before anything is sent. Or drop the required documents and generate a repayment plan in seconds.

Less "chat with AI". More old-school software powered by an agent. And new use cases discovered directly from the field: **forward-deployed engineering, HLM edition**.

French bureaucracy, with people's homes attached.

That is the open source product.

![Desktop screenshot](./desktop-screenshot.png)

## The Previous Version Looked Serious

PIERRE used to look like a proper classic RAG system. Every box was a future runbook:

```text
                        user question
                              │
              query augmentation/expansion (LLM call)
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       search-by-vectors.ts             search-by-bm25.ts
        (bge-m3 via Ollama)              (French stemmer)
              │                               │
              └──────────────┬────────────────┘
                             ▼
                  SQLite + sqlite-vec
                             │
                             ▼
              rank-chunks.ts → LLM-as-reranker
               (Groq or Cerebras, or wait)
                             │
                             ▼
                 LLM answer (fingers crossed)
```

It worked. Mostly. That is how complexity wins. One reasonable step at a time.

## The Problem Was the Contract

The bad part was not the code. Though, sometimes, yes, the code too. The bad part was the contract.

To run the thing properly, you now had at least:

- a chunking strategy nobody agreed on;
- a tokenizer bug you discovered only in production;
- a BM25 path, with French stemmers because naturally;
- hybrid search tuning between lexical and semantic retrieval;
- metadata filters users expected to "just work";
- a reranking layer with its own latency budget;

Then came the infrastructure:

- a GPU setup just to generate embeddings fast enough on a Linux VPS;
- a dedicated inference endpoint for full rebuilds;
- a vectorization pipeline to monitor, retry, and occasionally pray over;
- invisible retries around every provider call;
- timeout handling everywhere;
- logs to explain which layer failed;
- traces to understand why the "same" question gave different answers twice in a row;

And of course, the providers:

- a fast LLM for invisible calls, like Groq or Cerebras;
- a main provider like Mistral AI, Anthropic, OpenAI, or open models (DeepSeek, GLM, Qwen...);
- fallback providers because eventually one of them would return a beautiful `HTTP 500`;

Then came the meetings:

- "Why didn't it find my document?"
- "Why DID it find this document?"

…And eventually, a growing suspicion that half the stack existed mostly to compensate for the other half.

For a big search product, fine. For a self-hosted agent in a _bailleur social_, that's a lot to ask.

**A dependency is not just a package. It is a person who has to understand it later.**

Retrieval can answer "what does SLS mean?". A useful agent must answer "how many residences in Dijon have Iserba as the maintenance contractor?". That second question is not in plain text anywhere in the corpus. It is a `JOIN`.

So I left chatbots for harnesses: Pi (OpenClaw harness), Claude Code, Codex... And the question became simpler and harder:

> How do I give the agent access to the knowledge base and **minimize its reasoning turns** when speed matters?

## The Current Version Is Boring on Purpose

```text
build pipeline                                      runtime
─────────────                                       ───────
.docx / .xlsx                              one microVM per conversation
      |                                                 |
      v                                                 |
  db.sqlite                                          question
      ├─ documents (FTS5)                               |
      ├─ staff_contact_information                      |
      ├─ on_call_agent_procedures                       |
      ├─ rental_units                                   v
      └─ _readme (JSON schema) ── templated into ──> AGENTS.md  <- Pi reads at session start
                                                     db.sqlite  <- Pi queries via sqlite3
                                                        |
                                                        v
                                                      answer
```

Each PIERRE profile (tenant, on-call agent, collection officer…) gets one database. The harness sees only that file. Not a vector store plus a document store plus a metadata store plus a sidecar.

Markdown goes into an FTS5 table called `documents`. Spreadsheets become typed SQLite tables (`INTEGER` where every value is numeric, `TEXT` otherwise). At build time, each column is analyzed and a minified JSON schema is stored in `_readme`, then templated into `AGENTS.md` at session start.

Knowledge rebuild from scratch takes seconds. No GPU. Server cost moved from a €200/month GPU box to a €46/month Hetzner `AX41-NVMe` — old, cheap, and capable of nested virtualization for per-conversation microVMs (fully isolated, destroyed at the end; cold start is near-instant because the image is prebuilt). The model behind Pi is Claude Sonnet, billed per token: a few cents per conversation.

Per-conversation microVMs (via [Smol Machines](https://smolmachines.com/)) are not architectural fashion. Data never leaks between sessions, state is destroyed with the microVM, and the GDPR conversation with a _bailleur_ is much shorter.

That changes who gets to run AI. Not AI for organizations with platform teams. AI for the housing coordinator with a tiny IT department and a budget meeting in three weeks.

## Chunking Is Dead. For HLM Use Cases.

Chunking is hard. Fixed-size, overlap, semantic — entire libraries dedicated to it. I do not need any of it anymore.

The unstructured documents here (`.md`, `.docx`) are never 100 pages long. Each one covers one precise topic — a "one document, one topic" policy I follow and ask HLM organizations to follow too.

So the ingest does the simplest thing: one document, one row in the `documents` FTS5 table, full content. Period.

This is not always right. For a 500-page legal code, you would chunk. For short procedural notes written by humans for humans, you would not. **Match the strategy to the corpus, not to the meme.**

## BM25 Is Not Embarrassing

For prose, PIERRE uses SQLite FTS5:

```sql
tokenize = "unicode61 remove_diacritics 2 tokenchars '-'"
```

Three things in one line. `unicode61` for French. `remove_diacritics 2` because users forget accents and documents have them. `tokenchars '-'` because `loca-pass` is one word, not two.

French social housing has words you do not blur: `SLS`, `APL`, `CAF`, `loca-pass`, `charges récupérables`, `bailleur`, `conventionnement`, `commission d'attribution`. Lose the hyphen and the agent does a second turn to recover. The hyphen is not aesthetic. It is latency.

BM25 is old. So what. FTS5 because BM25 ranks; `LIKE` does not. The agent runs:

```sql
SELECT rowid, content, snippet(documents, 0, '**', '**', '…', 200) AS excerpt
FROM documents
WHERE documents MATCH '"loca-pass" OR "avance" OR "caution"'
ORDER BY rank LIMIT 5;
```

Query expansion is handled in the prompt, not in code. A capable LLM expands French synonyms well enough on a small corpus — tell it to, quote each term, combine with `OR`. No separate expansion service. `content` is always in the SELECT. The full document text comes back with the first query. The agent never fires a second query to re-fetch content it already has.

Not glamorous. Works.

## Spreadsheets Should Be Tables

A lot of organizational knowledge is not prose. Agency contacts. Rent grids. Routing rules. Patrimony data.

Do not chunk that and hope cosine similarity finds the right contractor for building "Rosa Parks".

PIERRE ingests Excel (`.xlsx`) by unmerging cells, normalizing headers and sheet names, and turning sheets into JSON rows. Names go to lowercase ASCII `snake_case` — the biggest single win:

```text
Caractéristiques techniques du patrimoine immobilier
                       │
                       ▼
caracteristiques_techniques_du_patrimoine_immobilier
```

Column names get the same treatment:

```text
Heating c.   ─►   heating_contractor
Date MES     ─►   date_mise_en_service
```

This is not cosmetic. It is interface design for the agent (human or not). An LLM writes better SQL against `procedure_pour_les_agents_d_astreinte` than against `Procédure pour les agents d'astreinte`. No quoting headaches. No invisible apostrophes. No accents that look identical but are not the same codepoint. `heating_contractor` is self-documenting. `Heating c.` is a riddle.

Naming is step one. **Typing** is step two.

French Excel is not CSV. Cells arrive as `1 234,56`, `25 %`, `1.234,56 €`, or `14/05/2024`. The ingest normalizes them before SQLite ever sees them:

- European decimals and thousands separators → JavaScript `number`
- Percentages → fractions (`25 %` → `0.25`)
- Currency symbols stripped (`€`, `$`, `£`, …)
- Dates → `YYYY-MM-DD` in Europe/Paris (`14/05/2024` → `2024-05-14`)

A column where every non-null value is numeric becomes `INTEGER`. Values are stored as numbers, not strings.

That matters the moment someone asks a counting question:

```sql
SELECT COUNT(*) FROM caracteristiques_du_patrimoine
WHERE surface_habitable > 50 AND annee_construction < 1990;
```

With everything as `TEXT`, the agent would need a cast, a guess, or a Python detour. With `INTEGER`, it just runs SQL.

The best retrieval improvement was not a better embedding model. It was making the data boring enough that a dumb agent could query it — **and count on it**.

## Agent Turns Are a Budget

This is the part that matters.

Minimizing turns is not a side-optimization. It is the difference between 10 seconds and 40 seconds. Same question. Same model. Only the turn budget changes. You can wait 40 seconds for Claude Code while making coffee. You cannot wait 40 seconds for a chatbot answer.

So the agent gets the map of the database for free. At build time, the pipeline analyzes every table and stores a minified JSON schema in `_readme`. At runtime, a template per profile contains a placeholder:

````text
```json
<!-- KNOWLEDGE_SCHEMA_HERE -->
```
````

That placeholder is replaced with the current `_readme` content and written into `AGENTS.md`. Pi reads it at session start.

Without that, the first turn is always discovery: `SELECT name FROM sqlite_master`, `PRAGMA table_info(...)`, `SELECT DISTINCT …`. Waste. The agent should spend its turns answering the tenant, not learning that a table exists.

### The schema is metadata, not a table of contents

The old schema was a Markdown table of names. Useful, but thin. The new one is JSON — one line per table, column metadata included. The build classifies each column:

- **discrete** (≤ 20 distinct values): lists the values, so the agent knows `type_logement` is `collectif` or `individuel` without probing
- **continuous_numeric** (> 20 values, `INTEGER`): `min` and `max` only
- **date** (all non-null `TEXT` values match `YYYY-MM-DD`): `min` and `max` date range
- **continuous_text**: free text, no enumeration

Long discrete values (> 40 characters) omit the list and expose `discrete_count` only — token budget again.

Abbreviated and prettified example:

```json
{
  "access": "read-only",
  "tables": [
    {
      "name": "communes",
      "rows": 2456,
      "columns": [
        {
          "name": "nom",
          "type": "TEXT",
          "not_null": true,
          "nature": "discrete",
          "discrete_count": 2,
          "values": ["lyon", "paris"]
        },
        {
          "name": "population",
          "type": "INTEGER",
          "not_null": true,
          "nature": "continuous_numeric",
          "min": 500000,
          "max": 2200000
        }
      ]
    },
    {
      "name": "documents",
      "description": "One complete document per row. Not chunked.",
      "engine": "fts5",
      "tokenizer": "unicode61 remove_diacritics 2 tokenchars '-'",
      "rows": 97,
      "columns": [
        { "name": "rowid", "indexed": false },
        { "name": "content", "indexed": true }
      ],
      "query_examples": [
        "SELECT rowid, content FROM documents WHERE documents MATCH 'chauffage';",
        "SELECT rowid, content, snippet(documents, 0, '[', ']', '...', 20) FROM documents WHERE documents MATCH 'ascenseur';",
        "SELECT rowid, content FROM documents WHERE documents MATCH '\"dégât des eaux\" AND urgence';"
      ]
    }
  ]
}
```

Same turn-budget logic as injecting table names — but the agent also sees value ranges and legal enums before its first query.

The same logic applies to the date. Many questions are time-sensitive ("Am I allowed to intervene tonight in this sensitive building?"). Without help, the agent calls a date tool — and doesn't even know the 2026 French public holidays. So `today_is()` is written into `AGENTS.md` at every session start:

```markdown
<session>Current date and time (Europe/Paris): Sunday, May 24, 2026 (Week 21) at 14:56 (french public holiday: Whit Sunday).</session>
```

Free. No tool call.

The prompt extends the same logic. Query through `sqlite3`, not `python3`. Do not call `.tables` or `PRAGMA` — the schema is already in context. Put independent queries in one turn. Prefer joins over chains of small queries. Always include `content` in the `SELECT` for `documents`.

This is not prompt-engineering theater. It is latency control.

### The `oxfmt` Story

I once formatted the injected schema with `oxfmt`. The output looked great — a proper Markdown table, columns aligned, headings in the right place. Some headings and column names were very long. The markup that aligned them was longer: stretches of whitespace between every `|` to keep the visual grid.

I shipped it.

The next day I noticed sessions started slow. Every session.

A schema that fit in a few hundred tokens of compact text exploded into thousands of tokens of beautiful prose. Multiplied by every session start. Multiplied by every conversation.

Seconds of latency, injected before the agent had even read the question. Pretty is not always kind. I reverted. Many seconds saved.

The schema is now JSON, not Markdown tables. `oxfmt` still formats DOCX→Markdown elsewhere in the pipeline, but the session-start trap can take a new shape: `JSON.stringify(schema, null, 2)` or an over-long `values` list on a discrete column would blow the budget just as fast. Hence minified JSON (`JSON.stringify(schema)` with no indentation) and `discrete_count` without values when any entry exceeds 40 characters. Same lesson, different formatter.

## The Boring Default

This is not a religion.

PIERRE today: a few hundred documents per profile, around ten spreadsheets — some with roughly 200,000+ rows. Boring scale. Ten million documents? Use a real search system. Fuzzy semantic discovery over unknown material? Embeddings are useful.

For a domain-specific product like this, retrieval can be one well-known file, a capable harness, a strong model, and a few boring rules that save turns:

- Quote FTS terms.
- Inject the schema once — don't make the agent rediscover tables.
- Normalize names. Type numbers and dates at ingest.
- Let the build describe columns: discrete values, ranges, dates.
- Keep the schema compact: minified JSON, no pretty-print.
- One topic per doc.
- Name Excel sheets and column headers like someone else will have to query them — because someone will.

I re-ran the same questions through both stacks. The new one was clearly better, and easier to evolve. But the prompt evolved in parallel. Honest enough.

That is not an AI problem. That is a knowledge-management problem.

---

May 27, 2026  
[Charles-Henri Arnould](https://www.linkedin.com/in/charnould) · charnould@pierre-ia.org  
Drafted in English with LLM help; opinions are mine.
