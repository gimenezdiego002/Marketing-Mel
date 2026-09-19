# Journey Edge three-minute demo

## 1. Open the workspace — 0:00–0:20

**Screen:** Landing page, then Overview.

**Say:** “Journey Edge connects campaign performance with Shopify revenue and turns changes into evidence-backed actions. Ad-platform writes are simulated for this hackathon; the Shopify connector uses the real Admin API.”

Click **Open live demo**. Point out the visible simulation label and spend controls.

## 2. Run the agent — 0:20–0:45

**Screen:** Overview.

**Say:** “This is a live analysis of four campaigns with 30 daily snapshots each. The agent compares each campaign with its own recent baseline.”

Click **Run agent**. The UI opens the Issues feed after analysis.

## 3. Explain the diagnosis — 0:45–1:20

**Screen:** Issues, then issue detail.

**Say:** “CTR fell 22%, CPM rose 15%, and frequency climbed 46%. CPA rose 46%, but post-click CVR stayed essentially flat. That combination identifies ad fatigue and rules against a landing-page or offer problem.”

Open the issue. Point to the fatigue score, evidence chips, trend, and narrative.

## 4. Review the generated creative — 1:20–1:50

**Screen:** Approvals.

**Say:** “The agent generated a new creative direction, but launching it is high risk. The code enforces an approval gate even with 90% confidence. This proposal changes spend by zero dollars.”

Click **Review proposed action** and show the creative and guardrail banner.

## 5. Approve safely — 1:50–2:10

**Screen:** Approvals.

**Say:** “I am the human in the loop. Approval records the decision and applies it only through the simulated connector, so no external advertising account changes during the demo.”

Click **Approve creative**.

## 6. Inject next week — 2:10–2:40

**Screen:** Experiments.

**Say:** “A real campaign would now wait seven days. For the demo, this button injects a deterministic recovery week.”

Open **Experiments** and click **Simulate next week**.

## 7. Close the loop — 2:40–3:00

**Screen:** Experiments result.

**Say:** “CPA moved from $30.34 to $21.83, a 28.1% improvement. CTR recovered to 2.4%, and the experiment is confirmed. The system measured the action instead of merely recommending it.”

Use **Reset** before the next rehearsal.

## Judge questions

### Is this connected to real Meta?

Meta and Google reads can use test accounts, but their writes are simulated behind the same connector interface. Production writes require platform permissions and review. The demo labels simulation mode clearly and never claims that a simulated write changed a live account.

### What stops it wasting money?

Spend caps run in code before a connector write. Reallocation has a percentage cap, a campaign cannot increase more than 25% in one day, low-confidence proposals remain recommendations, and high-risk actions require human approval.

### Is the diagnosis just an LLM guess?

No. Deterministic analytics calculate CTR, CPM, CVR, CPA, frequency, baselines, and the fatigue score. A rule table selects the likely cause from the combination. The language layer explains supplied evidence and rejects unsupported numeric claims.

### Why is the recovery believable?

The next-week fixture is declared simulated and reproducible. It lets the demo exercise the exact measurement path before seven real days exist. The experiment compares aggregate before-and-after metrics and records a verdict from the measured CPA change.

### What changes when a real merchant installs it?

Shopify orders come through the Admin GraphQL API. Approved Meta and Google connectors can replace the simulation implementation without changing analytics, guardrails, approvals, experiments, or the dashboard contract.
