import type { Action, ChatAnswer, DemoState, Experiment, GraphView, Issue, Organic, Trends } from './types'

const baseline = { ctr: 0.0172, cpm: 11.5, cvr: 0.028, cpa: 38.4, frequency: 2.4, roas: 3.1 }
const current = { ctr: 0.0108, cpm: 13.6, cvr: 0.028, cpa: 49.2, frequency: 3.8, roas: 2.1 }

const fatigueIssue: Issue = {
  id: 'creative-fatigue',
  type: 'creative_fatigue',
  title: 'People are getting tired of your best ad',
  campaign: 'Meta Prospecting',
  channel: 'Meta',
  severity: 'High',
  score: 0.82,
  confidence: 92,
  status: 'Awaiting approval',
  impact: 'Could win back about $1,240 a month',
  summary: 'The same people keep seeing it, and fewer of them are clicking than they used to.',
  narrative: 'Click-through fell from 1.72% to 1.08% while frequency rose to 3.8×. Landing-page conversion stayed flat, so this reads as creative fatigue rather than a broken offer.',
  evidence: [
    'CTR 1.08% vs 1.72% baseline',
    'Frequency 3.8× vs 2.4×',
    'CPM up 18% since last week',
    'CVR unchanged at 2.8%',
  ],
  baseline,
  current,
  trend: [1.74, 1.71, 1.69, 1.66, 1.61, 1.55, 1.48, 1.41, 1.33, 1.26, 1.19, 1.14, 1.1, 1.08],
}

const proposedAction: Action = {
  id: 'walkthrough-creative',
  issue_id: fatigueIssue.id,
  type: 'launch_creative',
  risk_tier: 'high',
  confidence: 0.92,
  status: 'proposed',
  rationale: 'Swap in two fresh images on the same budget and audience, then watch whether clicks recover.',
  spend_change: 0,
  decision: 'needs_approval',
  decision_reason: 'Launching new creative is high risk, so it waits for your yes.',
  creative: {
    variant_label: 'B',
    headline: 'Morning Ritual Blend',
    primary_text: 'Small-batch beans, roasted to order. The same brew — a fresher look.',
    call_to_action: 'Shop now',
    image_prompt: 'Steam over a cream cup, sage linen, morning window light',
  },
  guardrail_passed: true,
  guardrail_reason: '$0 spend change · confidence 92%',
}

const campaigns: DemoState['campaigns'] = [
  { id: 'meta_prospecting', name: 'Meta Prospecting', channel: 'Meta', spend: 12840, revenue: 26964, roas: 2.1, status: 'Needs attention' },
  { id: 'meta_retargeting', name: 'Meta Retargeting', channel: 'Meta', spend: 4460, revenue: 23192, roas: 5.2, status: 'Opportunity' },
  { id: 'google_brand_search', name: 'Google Brand Search', channel: 'Google', spend: 2180, revenue: 10028, roas: 4.6, status: 'Healthy' },
  { id: 'klaviyo_welcome_flow', name: 'Klaviyo Welcome Flow', channel: 'Klaviyo', spend: 0, revenue: 0, roas: null, status: 'Needs attention' },
]

const guardrails: DemoState['guardrails'] = {
  max_daily_spend: 750,
  max_reallocation_pct: 0.2,
  auto_pause_threshold: 0.35,
  min_confidence: 0.7,
  autonomy_level: 'assisted',
}

const overview = { shopify_revenue: 40280, ad_spend: 10886, blended_roas: 3.7, open_issues: 1, phase: 'awaiting_approval', thread_id: 'walkthrough' }

function stamp(event: string, detail: string) {
  return { time: '2026-09-19T15:12:00Z', event, detail }
}

export const walkthroughTrends: Trends = {
  window: 'Last 30 days',
  days: [
    { date: '2026-08-21', spend: 340, revenue: 1280, roas: 3.76, ctr: 0.017, cpa: 36 },
    { date: '2026-08-24', spend: 355, revenue: 1310, roas: 3.69, ctr: 0.0164, cpa: 37 },
    { date: '2026-08-27', spend: 362, revenue: 1295, roas: 3.58, ctr: 0.0151, cpa: 40 },
    { date: '2026-08-30', spend: 371, revenue: 1240, roas: 3.34, ctr: 0.0138, cpa: 43 },
    { date: '2026-09-02', spend: 380, revenue: 1188, roas: 3.13, ctr: 0.0126, cpa: 46 },
    { date: '2026-09-05', spend: 388, revenue: 1120, roas: 2.89, ctr: 0.0115, cpa: 48 },
    { date: '2026-09-08', spend: 396, revenue: 1074, roas: 2.71, ctr: 0.0108, cpa: 49 },
  ],
  campaigns: [],
}

export const walkthroughOrganic: Organic = {
  organic_revenue: 12100, organic_orders: 310, attributed_revenue: 28180, attributed_orders: 640,
  total_revenue: 40280, organic_share: 30, organic_repeat_rate: 22, organic_aov: 39,
  daily: [
    { date: '2026-08-21', organic: 400, attributed: 880 },
    { date: '2026-08-24', organic: 410, attributed: 900 },
    { date: '2026-08-27', organic: 390, attributed: 905 },
    { date: '2026-08-30', organic: 405, attributed: 835 },
    { date: '2026-09-02', organic: 398, attributed: 790 },
    { date: '2026-09-05', organic: 412, attributed: 708 },
    { date: '2026-09-08', organic: 420, attributed: 654 },
  ],
  sources: [
    { source: 'Direct', channel: 'Organic', orders: 180, revenue: 7020, share: 17, aov: 39 },
    { source: 'Google organic', channel: 'Organic', orders: 130, revenue: 5080, share: 13, aov: 39 },
  ],
}

export const walkthroughGraphReady: GraphView = {
  thread_id: 'walkthrough', phase: 'ready',
  nodes: ['ingest', 'detect', 'diagnose', 'generate', 'approve'].map(name => ({ name, status: 'pending' as const })),
  visited: [], interrupts: [],
}

export const walkthroughGraphWaiting: GraphView = {
  thread_id: 'walkthrough', phase: 'awaiting_approval',
  nodes: [
    { name: 'ingest', status: 'done' }, { name: 'detect', status: 'done' }, { name: 'diagnose', status: 'done' },
    { name: 'generate', status: 'done' }, { name: 'approve', status: 'pending' },
  ],
  visited: ['ingest', 'detect', 'diagnose', 'generate'],
  interrupts: [{ node: 'approve', waits_for: 'human' }],
}

const readyState: DemoState = {
  thread_id: 'walkthrough', phase: 'ready',
  overview: { ...overview, open_issues: 0, phase: 'ready' },
  campaigns, issues: [], actions: [], experiments: [], guardrails,
  events: [stamp('Walkthrough ready', 'Made-up Brew & Bloom numbers. Nothing is sent to an ad account.')],
}

const waitingState: DemoState = {
  thread_id: 'walkthrough', phase: 'awaiting_approval',
  overview: { ...overview, phase: 'awaiting_approval' },
  campaigns,
  issues: [fatigueIssue],
  actions: [proposedAction],
  experiments: [],
  guardrails,
  events: [
    stamp('Read Shopify and ads', 'Store sales were $40,280 and ad spend was $10,886.'),
    stamp('Change detected', 'Meta Prospecting scored above the fatigue threshold.'),
    stamp('Issue diagnosed', 'Creative fatigue selected from CTR, CPM, frequency, and flat CVR.'),
    stamp('Waiting for your OK', 'Two fresh images, same budget.'),
  ],
}

const measuredExperiment: Experiment = {
  id: 'walkthrough-week',
  campaign: 'Meta Prospecting',
  hypothesis: 'Fresh images on the same budget recover clicks without extra spend.',
  status: 'complete',
  verdict: 'confirmed',
  days: 7,
  before: current,
  after: { ctr: 0.0161, cpm: 12.1, cvr: 0.028, cpa: 35.4, frequency: 2.6, roas: 3.4 },
  changes: { cpa: -0.2806, ctr: 0.4907 },
}

export function walkthroughInitial(): DemoState {
  return structuredClone(waitingState)
}

export function walkthroughReset(): DemoState {
  return structuredClone(readyState)
}

export function walkthroughAfterRun(): DemoState {
  return structuredClone(waitingState)
}

export function walkthroughAfterDecision(state: DemoState, decision: 'approved' | 'rejected'): DemoState {
  const action = state.actions[0]
  if (!action) return state
  if (decision === 'rejected') {
    return {
      ...state,
      phase: 'rejected',
      overview: { ...state.overview, phase: 'rejected', open_issues: 0 },
      issues: state.issues.map(issue => ({ ...issue, status: 'Left as it is' })),
      actions: [{ ...action, status: 'rejected', decision: 'rejected' }],
      events: [{ time: '2026-09-19T15:40:00Z', event: 'Left as it is', detail: 'No connector write ran.' }, ...state.events],
    }
  }
  return {
    ...state,
    phase: 'applied',
    overview: { ...state.overview, phase: 'applied', open_issues: 0 },
    issues: state.issues.map(issue => ({ ...issue, status: 'Actioned' })),
    actions: [{ ...action, status: 'applied', decision: 'approved' }],
    events: [{ time: '2026-09-19T15:40:00Z', event: 'Approved', detail: 'The simulated write ran. Spend did not change.' }, ...state.events],
  }
}

export function walkthroughAfterWeek(state: DemoState): DemoState {
  if (state.phase !== 'applied') throw new Error('Approve a change before simulating the next week.')
  return {
    ...state,
    phase: 'measured',
    overview: { ...state.overview, phase: 'measured' },
    issues: state.issues.map(issue => ({ ...issue, status: 'Resolved' })),
    actions: state.actions.map(action => ({ ...action, status: 'measured' })),
    experiments: [structuredClone(measuredExperiment)],
    events: [{ time: '2026-09-19T16:10:00Z', event: 'Next week measured', detail: 'CPA fell 28%. Clicks recovered on the same budget.' }, ...state.events],
  }
}

export function walkthroughAnswer(): ChatAnswer {
  return {
    answer: 'This walkthrough uses the Brew & Bloom seed. The prospecting ad’s click rate dropped from 1.72% to 1.08% while frequency rose to 3.8×. Conversion on the page stayed flat, which is why this reads as creative fatigue.',
    evidence_cited: fatigueIssue.evidence.slice(0, 3),
    limitations: ['These figures are the worked example, not a live ad account.'],
  }
}

export function graphFor(phase: string): GraphView {
  if (phase === 'ready') return walkthroughGraphReady
  if (phase === 'measured' || phase === 'applied' || phase === 'rejected') {
    return {
      ...walkthroughGraphWaiting,
      phase,
      nodes: walkthroughGraphWaiting.nodes.map(node => ({ ...node, status: 'done' })),
      interrupts: [],
    }
  }
  return walkthroughGraphWaiting
}
