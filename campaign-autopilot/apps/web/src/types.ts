/**
 * The web <-> agent contract. This file is the single source of truth for every
 * payload crossing the boundary; the producing code lives in apps/agent/demo_runtime.py
 * and is exposed by apps/agent/main.py.
 *
 * ENDPOINTS (base URL = VITE_AGENT_URL, default http://127.0.0.1:8000)
 *   GET    /api/state                  -> DemoState
 *   POST   /api/agent/run              -> DemoState   (ingest -> detect -> diagnose -> generate -> hold for approval)
 *   POST   /api/approvals/{action_id}  -> DemoState   body { decision: 'approved' | 'rejected' }; 404 unknown id, 400 bad decision
 *   POST   /api/simulate-week          -> DemoState   409 until an action has status 'applied'
 *   POST   /api/reset                  -> DemoState
 *   POST   /api/chat                   -> ChatAnswer  body { message: string }  (1..1000 chars)
 *   GET    /api/guardrails             -> Guardrails
 *   PUT    /api/guardrails             -> Guardrails  body = full Guardrails object
 *
 * The agent may return additional fields (e.g. Issue.campaign_id, Issue.components,
 * Experiment.action_id). Extra fields are ignored here; removing a field below is a
 * breaking change and needs a matching change in demo_runtime.py.
 */

/** Rates are fractions (ctr 0.0197 = 1.97%); cpm/cpa/roas are absolute. */
export type Metrics = { ctr: number; cpm: number; cvr: number; cpa: number; frequency: number; roas: number }

export type Issue = {
  id: string; type: string; title: string; campaign: string; channel: string; severity: string
  /** Fatigue score on a 0..1 scale; the gauge renders score * 100. */
  score: number
  /** Whole percent, 0..100 (Action.confidence is the 0..1 form of the same number). */
  confidence: number
  status: string; impact: string; summary: string; narrative: string; evidence: string[]
  baseline: Metrics; current: Metrics
  /** Fourteen daily CTR values already expressed as percentages. */
  trend: number[]
}

export type Creative = { variant_label: string; headline: string; primary_text: string; call_to_action: string; image_prompt: string }

export type Action = {
  id: string; issue_id: string; type: string; risk_tier: string
  /** 0..1. */
  confidence: number
  /** 'proposed' -> 'applied' | 'rejected' -> 'measured'. */
  status: string
  rationale: string; spend_change: number; decision: string; decision_reason: string; creative: Creative
}

export type Experiment = {
  id: string; campaign: string; hypothesis: string; status: string; verdict: string; days: number
  before: Metrics; after: Metrics
  /** Signed fractions, e.g. cpa -0.2806 = a 28.06% reduction. */
  changes: { cpa: number; ctr: number }
}

export type Campaign = { id: string; name: string; channel: string; spend: number; revenue: number; roas: number | null; status: string }

export type Guardrails = { max_daily_spend: number; max_reallocation_pct: number; auto_pause_threshold: number; min_confidence: number; autonomy_level: 'recommend' | 'assisted' | 'auto' }

/** Arrays hold at most one element in the demo runtime, but are lists so real runs can grow. */
export type DemoState = {
  thread_id: string
  /** 'ready' | 'awaiting_approval' | 'applied' | 'rejected' | 'measured' | 'complete'. */
  phase: string
  overview: { shopify_revenue: number; ad_spend: number; blended_roas: number; open_issues: number; phase: string; thread_id: string }
  campaigns: Campaign[]; issues: Issue[]; actions: Action[]; experiments: Experiment[]; guardrails: Guardrails
  events: { time: string; event: string; detail: string }[]
}

export type ChatAnswer = { answer: string; evidence_cited: string[]; limitations: string[] }
