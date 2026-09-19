<!-- Project context and setup entry point for the Campaign Autopilot build. -->
# Campaign Autopilot

## Context

Campaign Autopilot is an agentic marketing system for small Shopify stores, built for a hackathon.

It ingests ad campaign data (Meta, Google, email) plus Shopify revenue, detects problems (e.g. creative fatigue), explains WHY using combinations of metrics, proposes an action and new ad creative, asks a human to approve risky actions, applies the action, then measures the result when new data arrives and learns.

### The core loop

One LangGraph graph:

ingest → analyze → detect → diagnose → plan → generate → approve → act → measure → learn

### Stack

- `apps/web`: Next.js 15 (App Router, TypeScript, Tailwind) dashboard.
- `apps/agent`: Python 3.12, FastAPI, LangGraph, Pandas, OpenAI API (structured outputs).
- `supabase/`: Postgres schema and migrations.
- `data/`: seed CSVs and scenario JSONs.
- `scripts/`: seed, demo, reset.

### Non-negotiable rules

1. The LLM never invents numbers. Every metric in any narrative must come from a tool result or database row that is passed into the prompt.
2. No write to any ad platform happens without passing guardrails (spend caps) AND the approval-tier check.
3. Every agent decision is written to an `audit_log` with timestamp, rationale, and confidence.
4. For the hackathon: Shopify reads are real (dev store). Meta/Google WRITES and "next week" performance are SIMULATED via `connectors/simulated.py`, behind the same interface as real connectors, so real ones can be dropped in later.
5. Keep code simple and readable. Prefer small files with one responsibility. Add a docstring at the top of every file explaining its role in the loop (use an appropriate comment for non-code files).

### Demo business

"Brew & Bloom", a Shopify coffee brand, ~$40k/month revenue. These are fictional demo assumptions, not measured results. Four campaigns:

- `meta_prospecting` — will show creative fatigue (the demo problem).
- `meta_retargeting` — healthy, ROAS ~5.2, small budget (the scale opportunity).
- `google_brand_search` — efficient, low volume.
- `klaviyo_welcome_flow` — email; opens fine, clicks declining.

### Working style

Read `BUILD_PLAN.md` before implementing a step. Complete only the requested step, run its verification, and report files created, each file's purpose, verification output, and decisions needed. Never skip ahead or refactor earlier steps unless asked.

## Layout

```text
campaign-autopilot/
  BUILD_PLAN.md
  README.md
  .env.example
  .gitignore
  Makefile
  apps/
    web/
    agent/
  supabase/
    migrations/
  data/
    seed/
    scenarios/
  scripts/
  docs/
```

## How to run

Step 0 supplies scaffolding only. Both app directories are empty; no service, database schema, or demo runs yet.

1. Copy `.env.example` to `.env` and fill in the required keys when implementing subsequent steps.
2. Keep `SIMULATION_MODE=true` for the hackathon.
3. Later steps will supply installation and startup instructions.

The Makefile exposes `dev-web`, `dev-agent`, `seed`, `demo`, `test`, and `reset`. All six currently print TODO messages only. GNU Make is needed to invoke them; on Windows, use a shell with Make installed, such as WSL.

Empty directories exist locally but Git does not track them. After cloning this Step 0 skeleton, recreate them using PowerShell if needed:

```powershell
'apps/web','apps/agent','supabase/migrations','data/seed','data/scenarios','scripts','docs' | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }
```
