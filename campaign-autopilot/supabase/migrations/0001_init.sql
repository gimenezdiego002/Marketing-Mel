-- Persistent memory for the ingest-to-learn loop. Metrics remain raw until the view.
begin;

-- Accounts identify the business whose campaigns the agent manages.
create table public.accounts (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    name text not null
);

-- Integrations describe the sources used during ingestion; config holds no required secrets.
create table public.integrations (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    account_id uuid not null references public.accounts(id),
    platform text not null check (platform in ('shopify', 'meta', 'google', 'klaviyo', 'simulated')),
    status text not null,
    config jsonb not null default '{}'::jsonb
);

-- Campaigns are the advertising or email efforts analyzed by the agent.
create table public.campaigns (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    account_id uuid not null references public.accounts(id),
    platform text not null check (platform in ('shopify', 'meta', 'google', 'klaviyo', 'simulated')),
    external_id text,
    name text not null,
    objective text,
    status text not null,
    daily_budget numeric check (daily_budget >= 0)
);

-- Snapshots preserve daily raw measurements used for detection and follow-up measurement.
create table public.campaign_snapshots (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    campaign_id uuid not null references public.campaigns(id),
    date date not null,
    impressions bigint check (impressions >= 0),
    clicks bigint check (clicks >= 0),
    spend numeric check (spend >= 0),
    conversions numeric check (conversions >= 0),
    revenue numeric,
    frequency numeric check (frequency >= 0),
    reach bigint check (reach >= 0),
    email_sends bigint check (email_sends >= 0),
    email_opens bigint check (email_opens >= 0),
    email_clicks bigint check (email_clicks >= 0),
    unique (campaign_id, date)
);

-- Shopify orders provide commerce context; created_at is the source order time when supplied.
create table public.shopify_orders (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    account_id uuid not null references public.accounts(id),
    external_id text not null,
    total numeric not null,
    customer_id text,
    is_repeat boolean,
    utm_campaign text,
    unique (account_id, external_id)
);

-- Issues record detected problems or opportunities together with their metric evidence.
create table public.issues (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    campaign_id uuid not null references public.campaigns(id),
    type text not null check (type in ('creative_fatigue', 'landing_page', 'retention_leak', 'anomaly', 'opportunity')),
    severity text not null,
    score numeric,
    evidence jsonb not null default '{}'::jsonb,
    status text not null default 'open' check (status in ('open', 'actioned', 'resolved', 'dismissed'))
);

-- Diagnoses explain a detected issue using evidence and an explicit confidence level.
create table public.diagnoses (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    issue_id uuid not null references public.issues(id),
    likely_cause text not null,
    narrative text not null,
    evidence jsonb not null default '{}'::jsonb,
    confidence numeric not null check (confidence between 0 and 1)
);

-- Actions hold proposals and their approval/application/measurement lifecycle.
-- As specified, actions and diagnoses share issue_id; there is no diagnosis_id column.
create table public.actions (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    issue_id uuid not null references public.issues(id),
    type text not null check (type in ('pause', 'reallocate', 'launch_creative', 'change_budget')),
    params jsonb not null default '{}'::jsonb,
    risk_tier text not null check (risk_tier in ('low', 'high')),
    confidence numeric not null check (confidence between 0 and 1),
    status text not null default 'proposed' check (status in ('proposed', 'approved', 'rejected', 'applied', 'measured')),
    rationale text not null
);

-- Creatives store generated variants attached to an action for human review.
create table public.creatives (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    action_id uuid not null references public.actions(id),
    headline text,
    primary_text text,
    image_prompt text,
    image_url text,
    variant_label text
);

-- Experiments link an applied action to a hypothesis, comparison campaign, and measured result.
create table public.experiments (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    action_id uuid not null references public.actions(id),
    hypothesis text not null,
    control_campaign_id uuid references public.campaigns(id),
    start_date date,
    end_date date,
    result jsonb,
    verdict text check (verdict in ('confirmed', 'refuted', 'inconclusive')),
    check (end_date >= start_date)
);

-- Guardrails store the account's spend and autonomy limits checked before applying actions.
create table public.guardrails (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    account_id uuid not null unique references public.accounts(id),
    max_daily_spend numeric not null check (max_daily_spend >= 0),
    max_reallocation_pct numeric not null default 15 check (max_reallocation_pct between 0 and 100),
    auto_pause_threshold numeric check (auto_pause_threshold >= 0),
    min_confidence numeric not null default 0.7 check (min_confidence between 0 and 1),
    autonomy_level text not null default 'recommend' check (autonomy_level in ('recommend', 'assisted', 'auto'))
);

-- Audit entries retain the actor, evidence payload, rationale, and confidence of each decision.
create table public.audit_log (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    account_id uuid not null references public.accounts(id),
    actor text not null check (actor in ('agent', 'human')),
    event text not null,
    payload jsonb not null default '{}'::jsonb,
    rationale text not null,
    confidence numeric check (confidence between 0 and 1)
);

-- Shared per-snapshot ratios; cast counts before dividing to preserve fractional results.
-- Missing inputs and zero denominators yield NULL, never a fabricated zero.
create view public.v_campaign_metrics with (security_invoker = true) as
select s.*,
    clicks::numeric / nullif(impressions, 0) as ctr,
    spend / nullif(clicks, 0) as cpc,
    spend / nullif(impressions, 0) * 1000 as cpm,
    conversions / nullif(clicks, 0) as cvr,
    spend / nullif(conversions, 0) as cpa,
    revenue / nullif(spend, 0) as roas
from public.campaign_snapshots s;

-- Browser roles have no policies yet. Server service-role access supports later agent steps.
alter table public.accounts enable row level security;
alter table public.integrations enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_snapshots enable row level security;
alter table public.shopify_orders enable row level security;
alter table public.issues enable row level security;
alter table public.diagnoses enable row level security;
alter table public.actions enable row level security;
alter table public.creatives enable row level security;
alter table public.experiments enable row level security;
alter table public.guardrails enable row level security;
alter table public.audit_log enable row level security;

commit;
