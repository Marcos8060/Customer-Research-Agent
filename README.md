# Customer Research Agent

An AI agent that generates a structured research brief for a company's customers — combining firmographic profiles, recent news/signals, and a synthesized "why this matters" takeaway.

Built with the [Vercel AI SDK](https://ai-sdk.dev/docs/agents/overview).

## Why this architecture

A combined brief needs three independent pieces of work per customer:

1. **Firmographics** — slow-changing facts (industry, size, HQ, funding stage, tech stack)
2. **Signals** — time-sensitive events (news, hiring, funding rounds, leadership changes)
3. **Synthesis** — combining 1 and 2 into a short "why this matters, right now" takeaway

Since firmographics and signals don't depend on each other, this is built as a **parallel workflow → evaluator/synthesizer** pattern: two research subagents run independently, then a synthesizer agent combines their output into the final structured brief.

The Vercel AI SDK was chosen because it gives strict control over output shape via Zod schemas — important for a client-facing brief that needs a predictable, repeatable format.

## Tech stack

- **Runtime:** Node.js + TypeScript (ESM), run via `tsx`
- **Package manager:** pnpm
- **LLM provider:** Anthropic, via `@ai-sdk/anthropic` (direct provider, not the Vercel AI Gateway — avoids an extra account dependency for client-billed work)
- **Agent framework:** [Vercel AI SDK](https://ai-sdk.dev/docs/agents/overview)
- **Web search:** [Tavily](https://tavily.com) — an AI-agent-optimized search API returning cleaned, cited results
- **Validation / structured output:** Zod

## Project structure

```
src/
  schema.ts                # Zod schema — the output contract for a customer brief
  tools/
    firmographics.ts       # Tavily-backed tool for company facts
    signals.ts              # Tavily-backed tool for recent news/signals
  agents/
    firmographicAgent.ts   # research subagent
    signalsAgent.ts         # research subagent
    synthesizer.ts           # combines both into the final brief
  orchestrate.ts            # runs both agents in parallel, synthesizes, grounding check
  evaluate.ts                # post-hoc QA pass: grounding, dead-source-URL check, completeness score
  export.ts                  # writes brief(s) to an .xlsx workbook
  db.ts                      # SQLite (node:sqlite) persistence for web app jobs
  jobQueue.ts                # tiny in-process concurrency-limited queue for the web app
  index.ts                   # CLI entry point — batch-researches a hardcoded customer list
  server.ts                  # web app entry point — HTTP API + serves public/
public/
  index.html                 # single-page vanilla JS/HTML frontend for the web app
```

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create a `.env` file in the project root:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   TAVILY_API_KEY=tvly-...
   ```
   `.env` is git-ignored — never commit real keys.

3. Run the entry point:
   ```bash
   pnpm dev
   ```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Runs `src/index.ts` with env vars loaded (`tsx --env-file=.env`) |

## Output schema

Every customer brief is validated against `customerBriefSchema` (`src/schema.ts`):

- `customerName`, `domain`
- `firmographics` — industry, employee count estimate (as a range, not a false-precision number), HQ, funding stage, tech stack highlights
- `recentSignals` — array of `{ date, headline, source, relevance }`
- `synthesis` — a short summary and suggested outreach timing
- `sourcesUsed` — URLs behind every claim, for trust and verification

## Web app (internal tool)

Beyond the CLI batch script, there's a small internal web app so teammates can request a brief for any customer on demand instead of editing `index.ts`.

Run it with:

```bash
pnpm run serve
```

This starts an HTTP server (default port `3001`, override with `PORT=...`) that serves a single-page frontend at `http://localhost:3001` and exposes:

| Endpoint | What it does |
|---|---|
| `POST /api/research` | Body `{ customerName, domain? }`. Kicks off a research job in the background and returns `{ id }` immediately — a brief takes 20-60+ seconds, so the request doesn't block on it. |
| `GET /api/research/:id` | Poll a job's status (`queued` \| `running` \| `done` \| `error`) and result. |
| `GET /api/research` | Recent job history, for the sidebar list. |
| `GET /api/research/:id/export` | Downloads that one completed brief as an `.xlsx`, reusing `export.ts`. |

Design notes:

- **Jobs run through a small in-process queue** (`jobQueue.ts`, concurrency 2) so multiple teammates hitting "run" at once don't all fire Tavily + Anthropic calls simultaneously. This is single-instance only — deploying more than one server process would need a real shared queue instead.
- **Results persist in SQLite** (`db.ts`, via Node's built-in `node:sqlite` — no native module/compile step needed) in `briefs.db` at the project root, so history survives a restart. It's gitignored; delete it any time to reset history.
- **No auth yet.** This is meant to run somewhere only your team can reach (e.g. behind a VPN or on localhost) — add auth before exposing it more broadly.
- **No rate/cost limiting beyond the queue.** Each brief costs real Anthropic + Tavily usage; keep an eye on spend if this gets shared with more people.

