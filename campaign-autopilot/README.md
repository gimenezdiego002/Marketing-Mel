# Campaign Autopilot

## Context

Campaign Autopilot is an agentic marketing system for small Shopify stores, built for a hackathon.

It ingests campaign data and Shopify revenue, detects problems such as creative fatigue, explains the combined evidence, proposes an action and new creative, pauses for human approval, applies the approved action, and measures the result when new data arrives.

The loop is:

```text
ingest → analyze → detect → diagnose → plan → generate → approve → act → measure → learn
```

The demo business is Brew & Bloom, a fictional Shopify coffee brand with four campaigns. `meta_prospecting` contains a reproducible fatigue pattern. Meta and Google writes and the next-week result remain explicitly simulated during the hackathon.

The system follows four operating rules:

1. Every displayed number comes from supplied data; the language layer cannot invent evidence.
2. Connector writes pass code-level spend caps and approval policy.
3. Decisions remain visible in the workflow activity trail.
4. Shopify can use real Admin API reads while ad writes use the replaceable simulated connector.

## Project layout

```text
campaign-autopilot/
  apps/web/               React and Vite dashboard
  apps/agent/graph.py     The loop as one LangGraph graph, with two human-in-the-loop pauses
  apps/agent/             FastAPI, analytics, connectors, guardrails, and LLM layer
  supabase/migrations/    PostgreSQL schema
  data/seed/              Deterministic campaign, order, and recovery fixtures
  data/scenarios/         Alternate problem definitions
  scripts/                Seed, reset, and demo runners
  docs/                   Workflow, API access, and speaker notes
```

## How to run

Requirements: Python 3.12+, Node 20+, and Docker Desktop for local Supabase.

From a fresh checkout, copy the environment template and install dependencies:

```powershell
Copy-Item .env.example .env
npm install
cd apps/web
npm install
cd ../..
python -m pip install -e ".[test]"
npx supabase start
python scripts/seed_db.py
```

Keep `SIMULATION_MODE=true`. Start the agent API:

```powershell
make dev-agent
```

In another terminal, start the React dashboard:

```powershell
make dev-web
```

Open `http://localhost:5173`. Click **Run agent**, open the detected issue, approve the creative, then open **Experiments** and click **Simulate next week**.

**Trends** and **Organic** are read-only views that work without running the agent: Trends charts
thirty days of daily spend against attributed revenue, and Organic splits Shopify revenue into
campaign-attributed and unattributed orders. Both read the same seeded fixtures as the loop.

Reset and rehearse the terminal workflow with:

```powershell
make reset
make demo
make test
```

On Windows, GNU Make is often installed as `mingw32-make` (for example with MSYS2); substitute that name, or run the commands from `Makefile` directly. The complete three-minute presentation is in `docs/demo-script.md`.

## The loop

`apps/agent/graph.py` builds the ten nodes as one LangGraph `StateGraph`:

```text
ingest → analyze → detect → diagnose → plan → generate → approve → act → measure → learn
```

Two nodes are real LangGraph interrupts rather than UI state. `approve` pauses until a human
decides on the creative, and `measure` pauses until the next week of data arrives — which is
exactly what the **Run agent**, **Approve creative**, and **Simulate next week** buttons resume.
`GET /api/graph` returns the node list and how far the current thread has walked it.

Branching is driven by the guardrails, not by the demo script. `plan` runs `spend_caps.check`
and `policy.decide`, so setting **Autonomy level** to *Recommend only*, or raising **Minimum
confidence** above 0.90, makes the loop stop at a recommendation and never reach the approval
gate or the connector. `apps/agent/tests/test_graph.py` covers each of those branches.

## Deploying

The dashboard is a static Vite build and the agent is a stateful process, so they deploy
to different places. The agent keeps its LangGraph checkpointer in memory, which means it
needs an always-on process — on serverless functions, Run agent and Approve can land on
different instances and the approval fails.

**Agent → Render** (`render.yaml` is a blueprint; New → Blueprint, point it at this repo):

| Setting | Value |
| --- | --- |
| Root directory | `campaign-autopilot` |
| Build command | `pip install -r requirements.txt` |
| Start command | `python -m uvicorn main:app --app-dir apps/agent --host 0.0.0.0 --port $PORT` |
| Health check | `/health` |
| Env | `WEB_ORIGIN` = your Vercel URL |

**Dashboard → Vercel** (`apps/web/vercel.json` holds the build config):

| Setting | Value |
| --- | --- |
| Root directory | `campaign-autopilot/apps/web` |
| Env | `VITE_AGENT_URL` = your Render URL, e.g. `https://journey-edge-agent.onrender.com` |

`VITE_AGENT_URL` is read at build time, so redeploy the dashboard after changing it. The agent
already accepts any `*.vercel.app` origin, so preview deployments work without extra config.
Render's free tier sleeps after inactivity — open the agent's `/health` once before presenting
so the first click is not waiting on a cold start.

## Web ↔ agent contract

The dashboard talks to the FastAPI agent directly over HTTP; there is no Next.js server or
browser-side Supabase access. `apps/web/src/types.ts` is the single source of truth for every
payload and lists all seven endpoints; `apps/web/src/api.ts` is the only place that calls them.

- Base URL comes from `VITE_AGENT_URL` (default `http://127.0.0.1:8000`). Vite reads the
  repo-root `.env` via `envDir` in `apps/web/vite.config.ts`, so there is one env file, not two.
- Every state-changing endpoint returns the whole `DemoState`, so the UI replaces its state from
  one response instead of merging partial updates.
- The agent accepts any `localhost`/`127.0.0.1` origin, so a Vite port fallback still works.
- Verify the wired-up flow end to end with `cd apps/web && npm run smoke` while both services run.
