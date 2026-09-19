<!-- Local database setup, verification, and the detection-to-measurement record flow. -->
# Database (Step 1)

From `campaign-autopilot`, with Docker running and Supabase CLI installed:

```sh
supabase start
make db-reset
```

Without Make, run `supabase db reset --local`. This rebuilds the local database and removes local data. It does not target a linked remote project. Supabase applies migration files as described in its [migration documentation](https://supabase.com/docs/guides/local-development/database-migrations).

Alternatively, against a fresh PostgreSQL 15+ database:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0001_schema.sql
```

For local Supabase the default connection is `postgresql://postgres:postgres@127.0.0.1:54322/postgres`. The verification runs inside a transaction and rolls back its fixtures. A final `select * from public.v_campaign_metrics limit 1` checks the view remains queryable.

## One issue's journey

1. Ingestion creates an account, integrations, campaigns, daily campaign snapshots, and Shopify orders. The account's guardrail row holds the human's limits.
2. Detection reads `v_campaign_metrics` and creates an `issues` row with type `creative_fatigue`, status `open`, and metric evidence.
3. Diagnosis creates a `diagnoses` row referencing that issue, with the likely cause, explanation, evidence, and confidence.
4. Planning creates an `actions` row for the same issue, initially `proposed`, with parameters, risk, confidence, and rationale. Generation adds `creatives` rows referencing the action.
5. Approval checks the account's guardrails. A human or authorized approval policy changes the action to `approved` or `rejected`. Each decision creates an `audit_log` row.
6. The simulated connector applies an approved action. The action becomes `applied`, the issue becomes `actioned`, and an `experiments` row records the action, hypothesis, control campaign, and measurement dates.
7. Next-week ingestion adds new snapshots. Measurement reads the same metrics view, fills the experiment's `result` and `verdict`, and marks the action `measured`. Evidence of resolution permits marking the issue `resolved`; a refuted or inconclusive experiment needs further investigation. The agent logs its conclusion for later learning.

The schema stores this lifecycle; later agent steps enforce transitions, guardrail checks, approval, and audit writes. SQL checks constrain valid status values but do not implement the workflow automatically.

## Schema decisions

- The supplied column list has `actions.issue_id`, not `actions.diagnosis_id`. Diagnoses and actions are siblings under the issue; there is no direct diagnosis-to-action foreign key.
- Counts and money remain raw. CTR/CVR are ratios (0.025 means 2.5%); undefined or missing ratios are NULL. Conversions allow fractional attribution.
- Shopify `created_at` should be supplied from the source order timestamp. The default is a fallback. `customer_id` is an external text identifier.
- One guardrail row per account; Shopify external order IDs are unique per account to avoid duplicated ingestion.
- Foreign keys restrict parent deletion by default, preserving linked history.
- RLS is enabled without browser policies. Use the server-only service role for now; browser access needs explicit policies in a later step. The view respects the querying role's RLS through `security_invoker`.
- Missing measurements remain NULL; they are not converted to zero. Experiment results and verdicts remain NULL until measured.
