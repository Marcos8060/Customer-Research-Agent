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
  schema.ts               # Zod schema — the output contract for a customer brief
  tools/
    firmographics.ts      # Tavily-backed tool for company facts
    signals.ts             # Tavily-backed tool for recent news/signals
  agents/
    firmographicsAgent.ts # research subagent
    signalsAgent.ts        # research subagent
    synthesizer.ts          # combines both into the final brief
  index.ts                 # Entry point / orchestration
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