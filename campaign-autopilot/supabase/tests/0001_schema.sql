-- Verify schema relationships and metric arithmetic without retaining test data.
begin;
do $$
declare
    account_uuid uuid;
    campaign_uuid uuid;
    issue_uuid uuid;
    action_uuid uuid;
    metrics record;
begin
    insert into public.accounts (name) values ('Schema verification') returning id into account_uuid;
    insert into public.integrations (account_id, platform, status) values (account_uuid, 'simulated', 'connected');
    insert into public.guardrails (account_id, max_daily_spend) values (account_uuid, 100);
    if not exists (select 1 from public.guardrails where account_id = account_uuid
        and max_reallocation_pct = 15 and min_confidence = 0.7 and autonomy_level = 'recommend') then
        raise exception 'Guardrail defaults failed';
    end if;
    insert into public.campaigns (account_id, platform, name, status)
        values (account_uuid, 'meta', 'Test campaign', 'active') returning id into campaign_uuid;
    insert into public.campaign_snapshots (campaign_id, date, impressions, clicks, spend, conversions, revenue)
        values (campaign_uuid, '2026-01-01', 1000, 25, 50, 5, 200);
    select * into metrics from public.v_campaign_metrics where campaign_id = campaign_uuid;
    if metrics.ctr is distinct from 0.025::numeric or metrics.cpc is distinct from 2::numeric
        or metrics.cpm is distinct from 50::numeric or metrics.cvr is distinct from 0.2::numeric
        or metrics.cpa is distinct from 10::numeric or metrics.roas is distinct from 4::numeric then
        raise exception 'Metric arithmetic failed';
    end if;
    insert into public.campaign_snapshots (campaign_id, date, impressions, clicks, spend, conversions, revenue)
        values (campaign_uuid, '2026-01-02', 0, 0, 0, 0, 0);
    select * into metrics from public.v_campaign_metrics where campaign_id = campaign_uuid and date = '2026-01-02';
    if metrics.ctr is not null or metrics.cpc is not null or metrics.cpm is not null
        or metrics.cvr is not null or metrics.cpa is not null or metrics.roas is not null then
        raise exception 'Zero denominators must yield NULL';
    end if;
    insert into public.campaign_snapshots (campaign_id, date) values (campaign_uuid, '2026-01-03');
    select * into metrics from public.v_campaign_metrics where campaign_id = campaign_uuid and date = '2026-01-03';
    if metrics.ctr is not null or metrics.roas is not null then
        raise exception 'Missing metrics must remain NULL';
    end if;
    begin
        insert into public.campaign_snapshots (campaign_id, date) values (campaign_uuid, '2026-01-01');
        raise exception 'Duplicate snapshot accepted';
    exception when unique_violation then null;
    end;
    begin
        insert into public.campaign_snapshots (campaign_id, date) values (gen_random_uuid(), '2026-01-01');
        raise exception 'Orphan snapshot accepted';
    exception when foreign_key_violation then null;
    end;
    insert into public.shopify_orders (account_id, external_id, total) values (account_uuid, 'test-order', 200);
    insert into public.issues (campaign_id, type, severity) values (campaign_uuid, 'creative_fatigue', 'high') returning id into issue_uuid;
    insert into public.diagnoses (issue_id, likely_cause, narrative, confidence)
        values (issue_uuid, 'fatigue', 'Test evidence narrative', 0.8);
    insert into public.actions (issue_id, type, risk_tier, confidence, rationale)
        values (issue_uuid, 'launch_creative', 'high', 0.8, 'Test proposal') returning id into action_uuid;
    insert into public.creatives (action_id, headline) values (action_uuid, 'Test creative');
    insert into public.experiments (action_id, hypothesis, control_campaign_id)
        values (action_uuid, 'Refresh improves response', campaign_uuid);
    update public.actions set status = 'approved' where id = action_uuid;
    update public.actions set status = 'applied' where id = action_uuid;
    update public.experiments set verdict = 'inconclusive', result = '{"reason":"test only"}' where action_id = action_uuid;
    update public.actions set status = 'measured' where id = action_uuid;
    insert into public.audit_log (account_id, actor, event, rationale, confidence)
        values (account_uuid, 'agent', 'measured', 'Verification only', 0.8);
    begin
        update public.actions set status = 'invalid' where id = action_uuid;
        raise exception 'Invalid action status accepted';
    exception when check_violation then null;
    end;
    begin
        update public.diagnoses set confidence = 1.1 where issue_id = issue_uuid;
        raise exception 'Invalid confidence accepted';
    exception when check_violation then null;
    end;
    raise notice 'PASS: lifecycle inserts, defaults, ratios, NULL handling, uniqueness, foreign keys, status and confidence constraints';
end $$;
rollback;

select * from public.v_campaign_metrics limit 1;
