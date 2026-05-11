# One SQLite File. One Agent. Full RAG for French HLM.

I deleted a lot of glue code. 10+ dependencies. A chunking strategy. A vector database. French stemmers. An embedding model. A reranker. A costly build pipeline. A €200/month Hetzner GPU. A €15/month Hugging Face inference endpoint. A few euros per month for LLM-as-reranker calls on Groq or Cerebras.

And the project got better.

This is the short story.

[PIERRE](https://pierre-ia.org/) is [an open-source AI agent](https://github.com/charnould/pierre) for French social housing — _HLM_ — and a learning project on the side. Tenants asking about their _SLS_. On-call agents looking up procedures. Collection officers cross-checking patrimony data. And for those not at ease with a chat UI, a plain textarea-and-submit form that drafts, in six seconds, a reply to a paper letter. French bureaucracy, with people's homes attached.

A tenant question looks like this:

> "I suspect there may be an error in the calculation of my solidarity rent surcharge (SLS). What documents can I request to understand exactly how the calculation was made?"

That looks like support. It is not. The answer may depend on French social housing law, a local procedure, exact vocabulary, the tenant's situation, and a spreadsheet maintained by a landlord. The agent has to find all of that, or it fails.

That is the product.

## Open Source Because Peers Are Not Competitors

A word on why PIERRE is open.

French social housing landlords do the same public-interest job across territories. Paris and Marseille are not in a market battle — same procedures, same laws, different spreadsheets. So the [shared HLM knowledge base](https://github.com/charnould/pierre/tree/master/knowledge) in PIERRE is open data, the code is open, and the movement can fork, host, and improve it. Some already do.

HLM must not miss the AI wave. It has missed enough already, and each time the pattern repeats: closed platforms, expensive integrations, long promises, little lasting innovation. "AI strategy" now means proprietary tooling, consulting, and fresh dependency.

PIERRE is built the **other way**: open, modular, pragmatic. Modern enough to be useful. Simple enough for a small IT team. Reusable from one landlord to the next. And able to plug into the prehistoric apps the sector cannot drop overnight.

"Own your IT stack" — every euro spent on complexity, proprietary integrations, or vendor lock-in is a euro not spent on social housing.

So the question was not:

> How do I build the strongest retrieval system?

It was:

> What shape best fits the HLM use cases about to surface?

That distinction changed the architecture. I removed a lot.

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

The bad part was not only the code. Though, sometimes, yes, the code too. The bad part was the contract.

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
- a main provider like Mistral AI, Anthropic, or OpenAI;
- fallback providers because eventually one of them would return a beautiful `HTTP 500`;

Then came the meetings:

- "Why didn't it find my document?"
- "Why DID it find this document?"

…And eventually, a growing suspicion that half the stack existed mostly to compensate for the other half.

For a big search product, fine. For a self-hosted agent in a _bailleur social_, that's a lot to ask.

A dependency is not just a package. It is a person who has to understand it later.

Retrieval can answer "what does SLS mean?". A useful agent must answer "how many residences in Dijon have Iserba as the maintenance contractor?". That second question is not in plain text anywhere in the corpus. It is a `JOIN`.

So I left chatbots for harnesses: [Pi](https://github.com/earendil-works/pi) (CLI agent harness, MIT), Claude Code, Codex. Then the question became simpler and harder:

> How do I give the agent access to the knowledge base and **minimize its reasoning turns** when speed matters?

## The Current Version Is Boring on Purpose

```text
build pipeline                                         runtime
─────────────                                          ───────
.docx / .xlsx ─► db.sqlite                             per-microVM/conversation:
                 ├─ documents (FTS5)                   /knowledge/AGENTS.md   ← Pi reads at session start
                 ├─ employee_contacts                  /knowledge/db.sqlite   ← Pi queries via sqlite3
                 ├─ procedure_pour_les_agents
                 ├─ caracteristiques_du_patrimoine
                 └─ _readme  ─── templated into ────►  AGENTS.md
```

Each PIERRE profile (on-call agent, on-call manager, collection officer…) gets one database. The harness sees only that file. That is the full knowledge it has. Not a vector store plus a document store plus a metadata store plus a sidecar.

Markdown goes into an FTS5 table called `documents`. Spreadsheets become regular SQLite tables. The schema description lives in a single-row `_readme` table, then templated into an `AGENTS.md` at session start.

Knowledge rebuild from scratch takes seconds. The whole pipeline is two files. No GPU. Server cost moved from a €200/month GPU box to a €46/month Hetzner `AX41-NVMe` — old, cheap, and capable of nested virtualization for per-conversation microVMs (fully isolated, destroyed at the end; cold start is near-instant because the image is prebuilt). The model behind Pi is Claude Sonnet, billed per token: a few cents per conversation at current pricing. The harness is provider-agnostic — I have tried OpenAI (5.x-class) and Mistral casually; in practice I run Sonnet.

Per-conversation microVMs are not architectural fashion. They mean data never leaks between sessions, state is destroyed with the microVM, and the GDPR conversation with a _bailleur_ is much shorter.

That changes who gets to run AI. Not AI for organizations with platform teams. AI for the housing coordinator with a tiny IT department and a budget meeting in three weeks.

## Chunking Is Dead. For HLM Use Cases.

Chunking is hard. Fixed-size, overlap, semantic, structural — entire libraries dedicated to it. I do not need any of it.

The unstructured documents here (`.md`, `.docx`) are never 100 pages long. Each one covers one precise topic — a "one document, one topic" policy I follow when writing knowledge and ask HLM organizations to follow too (the easy part).

So the ingest does the simplest thing: one document, one row in the `documents` FTS5 table, full content. Period.

This is not always right. For a 500-page legal code, you would chunk. For short procedural notes written by humans for humans, you would not. Match the strategy to the corpus, not to the meme.

## BM25 Is Not Embarrassing

For prose, PIERRE uses SQLite FTS5:

```sql
tokenize = "unicode61 remove_diacritics 2 tokenchars '-'"
```

Three things in one line. `unicode61` for French. `remove_diacritics 2` because users forget accents and documents have them. `tokenchars '-'` because `loca-pass` is one word, not two.

French social housing has words you do not blur: `SLS`, `APL`, `CAF`, `loca-pass`, `charges récupérables`, `bailleur`, `conventionnement`, `commission d'attribution`. Lose the hyphen and the agent does a second turn to recover. The hyphen is not aesthetic. It is latency.

BM25 is old. So what. FTS5 because BM25 ranks; `LIKE` does not. The agent runs:

```sql
SELECT rowid, filename, source, content,
       snippet(documents, 0, '**', '**', '…', 200) AS excerpt
FROM documents
WHERE documents MATCH '"loca-pass" OR "avance" OR "caution"'
ORDER BY rank LIMIT 5;
```

Query expansion is handled in the prompt, not in code. A capable LLM expands French synonyms well enough on a small corpus — tell it to, quote each term, combine with `OR`. No separate expansion service.

`content` is always in the SELECT. The full document text comes back with the first query. If a result looks relevant, the agent reads it right there — it never fires a second query to re-fetch content it already has.

Not glamorous. Works.

## Spreadsheets Should Be Tables

A lot of organizational knowledge is not prose. Agency contacts. Rent grids. Routing rules. Patrimony data.

Do not chunk that and hope cosine similarity finds the right contractor for building "Rosa Parks".

PIERRE ingests Excel (`.xlsx`) by unmerging cells, normalizing headers and sheet names, and turning sheets into JSON rows. Sheets become SQLite tables. Excel is hell, but bounded at this scale. Names go to lowercase ASCII `snake_case` — the biggest single win:

```text
Caractéristiques techniques du patrimoine immobilier
                       │
                       ▼
caracteristiques_techniques_du_patrimoine_immobilier
```

Column names get the same treatment. I ask HLM organizations to name them as if a human had to read the table afterwards — because one always does, eventually. Respect your reader.

```text
Heating c.   ─►   heating_contractor
Date MES     ─►   date_mise_en_service
```

This is not cosmetic. It is interface design for the agent (human or not). An LLM writes better SQL against `procedure_pour_les_agents_d_astreinte` than against `Procédure pour les agents d'astreinte`. No quoting headaches. No invisible apostrophes. No accents that look identical but are not the same codepoint. Best of all, the agent understands what the column is _about_. `heating_contractor` is self-documenting. `Heating c.` is a riddle.

The best retrieval improvement was not a better embedding model. It was making the data boring enough that a dumb agent could query it.

## Agent Turns Are a Budget

This is the part that matters.

Minimizing turns is not a side-optimization. It is the difference between 8 seconds and 40 seconds. Same question. Same model. Only the turn budget changes. Same conditions, stopwatch in hand. You can wait 40 seconds for Claude Code while making coffee. You cannot wait 40 seconds for a chatbot answer.

So the agent gets the map of the database for free. At build time, the schema description is stored in the `_readme` table. At runtime, a template per profile contains a placeholder:

```markdown
<schema_content><!-- KNOWLEDGE_SCHEMA_HERE --></schema_content>
```

That placeholder is replaced with the current `_readme` content and written into `AGENTS.md`. Pi reads it at session start.

Without that, the first turn is always discovery: `SELECT name FROM sqlite_master`, `PRAGMA table_info(...)`. Waste. The agent should spend its turns answering the tenant, not learning that a table exists.

The same logic applies to the date. Many questions are time-sensitive ("Am I allowed to intervene tonight in this sensitive building?"). Without help, the agent calls a date tool. So `today_is()` is written into `AGENTS.md` every time a session starts:

```markdown
<session>Current date and time (Europe/Paris): …</session>
```

Free. No tool call.

The prompt extends the same logic. Query through `sqlite3`, not `python3`. Do not call `.tables` or `PRAGMA` — the schema is already in context. Put independent queries in one turn. Prefer joins over chains of small queries. Always include `content` in the SELECT — never fetch a snippet first and re-fetch the full document in a second call.

This is not prompt-engineering theater. It is latency control.

### The `oxfmt` Story

I once formatted `AGENTS.md` with `oxfmt`. The output looked great — a proper Markdown table, columns aligned, headings in the right place. Some headings and column names were very long. The markup that aligned them was longer: stretches of whitespace between every `|` to keep the visual grid.

I shipped it.

The next day I noticed sessions started slow. Every session.

A schema that fit in a few hundred tokens of compact text exploded into thousands of tokens of beautiful prose. Multiplied by every session start. Multiplied by every conversation.

Seconds of latency, injected before the agent had even read the question. Pretty is not always kind. I reverted to the compact version. Many seconds saved.

## The Boring Default

This is not a religion.

PIERRE today: a few hundred documents per profile, around ten spreadsheets — one of them roughly 50,000 rows of per-dwelling patrimony data. Boring scale. Ten million documents? Use a real search system. Fuzzy semantic discovery over unknown material? Embeddings are useful.

The point is simpler. Agents are now good enough that the `R` in RAG does not have to mean a vector database plus a retrieval pipeline plus a reranker. For a domain-specific product like this, retrieval can be one well-known file, a capable harness, a strong model, and a few boring rules that save turns.

Quote FTS terms. Inject the schema once. Don't make the agent rediscover tables. Normalize names. Keep one topic per doc. Name Excel sheets and column headers like someone else will have to query them — because someone will.

That is not an AI problem. That is a knowledge-management problem. The HLM corpus is bounded by law and procedure.

I re-ran the same questions through both stacks. The new one was clearly better, and easier to evolve. But the prompt evolved in parallel. Honest enough.

For PIERRE, the honest default is one file, one harness, one model.

---

May 20, 2026  
Charles-Henri Arnould (charnould@pierre-ia.org)  
Drafted in English with LLM help; opinions are mine.
