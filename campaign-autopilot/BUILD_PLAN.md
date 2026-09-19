How this works
1. Create an empty folder campaign-autopilot, put BUILD_PLAN.md inside it, and open it in Claude Code (or Cursor).
2. Paste Prompt 0 first — it gives the AI the full context and rules. Everything after builds on it.
3. Then paste one prompt at a time. After each, run the "Check" and read the "What you just built" note so you understand the system as it grows.
4. If a step fails, paste the error back with: "This failed in Step N. Fix it without changing earlier steps."
Each section has three parts:
- 🧠 For you — plain-English explanation of what this piece is and why it exists
- 📋 Prompt — copy-paste text for the AI
- ✅ Check — how you confirm it worked
🧠 For you: AI coding agents work best when they know the whole system before writing the first file. This prompt is the "briefing": what the product does, the architecture, and the rules that must never be broken (no invented numbers, no ad-platform writes without guardrails). Every later prompt assumes the AI has read this.
📋 Prompt:
```
You are the lead engineer building "Campaign Autopilot", an agentic marketing system for small Shopify stores, for a hackathon.

WHAT IT DOES
It ingests ad campaign data (Meta, Google, email) plus Shopify revenue, detects problems (e.g. creative fatigue), explains WHY using combinations of metrics, proposes an action and new ad creative, asks a human to approve risky actions, applies the action, then measures the result when new data arrives and learns.

THE CORE LOOP (one LangGraph graph)
ingest → analyze → detect → diagnose → plan → generate → approve → act → measure → learn

STACK
- apps/web: React (Vite, TypeScript, Tailwind) dashboard
- apps/agent: Python 3.12, FastAPI, LangGraph, Pandas, OpenAI API (structured outputs)
- supabase/: Postgres schema + migrations
- data/: seed CSVs and scenario JSONs
- scripts/: seed, demo, reset

NON-NEGOTIABLE RULES
1. The LLM never invents numbers. Every metric in any narrative must come from a tool result or database row that is passed into the prompt.
2. No write to any ad platform happens without passing guardrails (spend caps) AND the approval-tier check.
3. Every agent decision is written to an audit_log with timestamp, rationale, and confidence.
4. For the hackathon: Shopify reads are real (dev store). Meta/Google WRITES and "next week" performance are SIMULATED via connectors/simulated.py, behind the same interface as real connectors, so real ones can be dropped in later.
5. Keep code simple and readable. Prefer small files with one responsibility. Add a docstring at the top of every file explaining its role in the loop.

DEMO BUSINESS (used in all seed data)
"Brew & Bloom", a Shopify coffee brand, ~$40k/month revenue. Four campaigns:
- meta_prospecting — will show creative fatigue (this is the demo problem)
- meta_retargeting — healthy, ROAS ~5.2, small budget (the scale opportunity)
- google_brand_search — efficient, low volume
- klaviyo_welcome_flow — email; opens fine, clicks declining

WORKING STYLE
- Read BUILD_PLAN.md in the repo root for exact specs of each step.
- I will give you one step at a time. Complete ONLY that step, run its verification, then stop and give me: (a) files created, (b) what each does in one line, (c) the verification output, (d) anything I should understand or decide.
- Never skip ahead or refactor earlier steps unless I ask.

Confirm you understand by summarizing the loop and the 5 rules in your own words, then wait for Step 0.

```
✅ Check: The AI's summary mentions the loop, the "no invented numbers" rule, and simulated writes. If it starts writing code, stop it and say "wait for Step 0."
🧠 For you: This creates the folder layout and environment-variable template. Nothing runs yet; it's the scaffolding so every later piece has an obvious home. .env.example lists every secret the project will ever need — you copy it to .env and fill in only what you have (for the hackathon you mostly need OPENAI_API_KEY and Supabase keys). SIMULATION_MODE=true is the switch that makes ad-platform writes fake.
📋 Prompt:
```
Step 0: create the repo skeleton exactly as in BUILD_PLAN.md Step 0.

- Create the folder tree (apps/web, apps/agent, supabase/migrations, data/seed, data/scenarios, scripts, docs).
- .env.example with every key listed in BUILD_PLAN, each with a one-line comment explaining what it's for and whether it's required for the hackathon (mark OPENAI_API_KEY and SUPABASE_* as required; mark META_*, GOOGLE_* as optional).
- .gitignore for Node, Python, .env.
- Makefile with targets: dev-web, dev-agent, seed, demo, test, reset (stub the commands; we'll fill them in later steps).
- README.md containing the context from Prompt 0 plus a "How to run" section (stub).

Then run `tree -L 2` and show me the output.

```
✅ Check: tree -L 2 shows the layout. Open .env.example and make sure you understand each key.
