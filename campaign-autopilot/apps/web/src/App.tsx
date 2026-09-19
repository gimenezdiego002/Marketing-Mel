import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, Bot, CheckCircle2, FlaskConical, Gauge, LayoutDashboard, Leaf, LineChart, LoaderCircle, MessageSquare, Play, RotateCcw, Settings, ShieldCheck } from 'lucide-react'
import { api } from './api'
import { ActionProposal, BeforeAfterCard, ChatPanel, Delta, DiagnosisPanel, IssueCard, OrganicSplitChart, SafetyCard, SpendRevenueChart, Status } from './components'
import { DotField, LogoCloud, Mark } from './brand'
import type { DemoState, Guardrails, Issue } from './types'

type Page = 'Overview' | 'Issues' | 'Approvals' | 'Campaigns' | 'Trends' | 'Organic' | 'Experiments' | 'Chat' | 'Guardrails'
const nav: { page: Page; icon: typeof Activity }[] = [
  { page: 'Overview', icon: LayoutDashboard }, { page: 'Issues', icon: AlertTriangle }, { page: 'Approvals', icon: CheckCircle2 },
  { page: 'Campaigns', icon: BarChart3 }, { page: 'Trends', icon: LineChart }, { page: 'Organic', icon: Leaf },
  { page: 'Experiments', icon: FlaskConical }, { page: 'Chat', icon: MessageSquare }, { page: 'Guardrails', icon: Settings },
]
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

/** Load a read-only view that lives outside the workflow state. */
function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState('')
  useEffect(() => {
    let live = true
    load().then(value => { if (live) setData(value) }).catch(problem => { if (live) setError(problem instanceof Error ? problem.message : 'Could not load this view') })
    return () => { live = false }
  }, [])
  return { data, error }
}

function Landing({ launch }: { launch: () => void }) {
  return <div className="landing"><header className="landing-header"><button className="journey-brand"><Mark size={28}/> Journey Edge</button><nav><a href="#product">Product</a><a href="#workflow">How it works</a><a href="#safety">Safety</a><button className="primary" onClick={launch}>Open live demo →</button></nav></header>
    <main><section className="hero"><div className="hero-copy"><p className="landing-eyebrow">AI MARKETING OPERATIONS FOR SHOPIFY BRANDS</p><h1>Know what to fix.<br/><em>Understand why.</em><br/>Stay in control.</h1><p>Journey Edge finds performance problems, explains the combined evidence, prepares the fix, and pauses before high-impact actions.</p><div className="hero-actions"><button className="primary large" onClick={launch}>Explore the live workflow →</button><span>Real Shopify reads · simulated ad writes</span></div></div><DashboardPreview onClick={launch}/></section>
      <LogoCloud/><section className="proof" id="product"><p className="landing-eyebrow">FROM SIGNAL TO SAFE ACTION</p><h2>One visible, measurable loop.</h2><div className="proof-grid"><article><Bot/><h3>Diagnose</h3><p>Compare each campaign with its own baseline and explain the metric combination.</p></article><article><ShieldCheck/><h3>Approve safely</h3><p>Apply spend caps, confidence policy, and a visible human approval gate.</p></article><article><Gauge/><h3>Measure recovery</h3><p>Inject the next week and show whether CPA and CTR actually recovered.</p></article></div></section>
      <section className="workflow" id="workflow"><div><p className="landing-eyebrow">THE AGENT LOOP</p><h2>From raw data to a measured decision.</h2></div><ol><li>Ingest Shopify and campaign data</li><li>Detect change against baseline</li><li>Diagnose with combined metrics</li><li>Generate and review creative</li><li>Apply through guardrails</li><li>Measure the next seven days</li></ol></section>
      <section className="control" id="safety"><div><p className="landing-eyebrow">AUTOMATION WITH BOUNDARIES</p><h2>Useful AI.<br/><em>Your rules.</em></h2></div><div className="control-list"><article><CheckCircle2/><div><h3>No invented numbers</h3><p>Every displayed metric comes from the seeded snapshots or measured recovery rows.</p></div></article><article><CheckCircle2/><div><h3>No silent high-risk action</h3><p>Creative launches wait at an approval gate and keep a decision trail.</p></div></article><article><CheckCircle2/><div><h3>No hidden spend increase</h3><p>The current proposal changes daily spend by exactly $0.</p></div></article></div></section>
    </main><footer><DotField area="footer"/><div className="journey-brand"><Mark size={24}/> Journey Edge</div><p>Evidence-led marketing operations.</p></footer></div>
}

function DashboardPreview({ onClick }: { onClick: () => void }) {
  return <button className="preview" onClick={onClick}><div className="preview-bar"><b><Mark size={15}/> Journey Edge</b><span>Brew &amp; Bloom</span></div><div className="preview-body"><p>NEEDS ATTENTION</p><h3>Creative fatigue detected</h3><div className="mini-metrics"><div><span>Fatigue score</span><b>61</b></div><div><span>CPA change</span><b>+46%</b></div></div><div className="preview-alert"><AlertTriangle/><span>High-risk creative launch<br/><small>Waiting for your approval</small></span></div></div></button>
}

function Empty({ title, body }: { title: string; body: string }) { return <div className="empty"><Bot/><h3>{title}</h3><p>{body}</p></div> }
function PageHeading({ eyebrow, title, body, action }: { eyebrow: string; title: string; body: string; action?: React.ReactNode }) { return <section className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{body}</p></div>{action}</section> }

function Overview({ state, openIssue }: { state: DemoState; openIssue: (issue: Issue) => void }) {
  return <><PageHeading eyebrow="BREW & BLOOM · LIVE WORKSPACE" title="Marketing autopilot" body="The complete decision loop, with every action visible."/>
    <section className="metrics"><article><span>Shopify revenue</span><strong>{money(state.overview.shopify_revenue)}</strong><small>1,300 test orders</small></article><article><span>Campaign spend</span><strong>{money(state.overview.ad_spend)}</strong><small>Across four campaigns</small></article><article><span>Attributed ROAS</span><strong>{state.overview.blended_roas.toFixed(2)}×</strong><small>Revenue ÷ spend</small></article><article><span>Agent state</span><strong className="phase">{state.phase.replaceAll('_', ' ')}</strong><small>{state.overview.open_issues} active issue</small></article></section>
    <section className="overview-grid"><div className="panel"><div className="panel-heading"><div><h2>Needs attention</h2><p>Ranked by severity and confidence</p></div></div>{state.issues.length ? state.issues.map(issue => <IssueCard key={issue.id} issue={issue} onClick={() => openIssue(issue)}/>) : <Empty title="Ready to analyze" body="Click Run agent to scan all four campaigns against their recent baselines."/>}</div>
      <div className="panel"><div className="panel-heading"><div><h2>Agent activity</h2><p>A readable decision trail</p></div></div><ol className="timeline">{state.events.map((event, index) => <li key={`${event.time}-${index}`}><span/><div><strong>{event.event}</strong><p>{event.detail}</p></div></li>)}</ol></div></section>
    <SafetyCard/>
  </>
}

function Issues({ state, select }: { state: DemoState; select: (issue: Issue) => void }) { return <><PageHeading eyebrow="WORK QUEUE" title="Issues and opportunities" body="Every diagnosis is traceable to computed evidence."/>{state.issues.length ? <div className="issues-grid">{state.issues.map(issue => <IssueCard key={issue.id} issue={issue} onClick={() => select(issue)}/>)}</div> : <Empty title="No issues yet" body="Run the agent to detect changes in the loaded campaign history."/>}</> }

function IssueDetail({ issue, action, back, goApproval }: { issue: Issue; action: DemoState['actions'][number] | undefined; back: () => void; goApproval: () => void }) { return <><button className="back" onClick={back}>← Back to issues</button><PageHeading eyebrow={`${issue.campaign.toUpperCase()} · ${issue.confidence}% CONFIDENCE`} title={issue.title} body={issue.summary} action={<button className="primary" onClick={goApproval}>Review proposed action →</button>}/><div className="detail-grid"><DiagnosisPanel issue={issue}/><aside className="panel diagnosis-side"><Status>{issue.status}</Status><h3>What ruled out the landing page?</h3><p>CVR changed only {(issue.current.cvr / issue.baseline.cvr * 100 - 100).toFixed(1)}%. People who click still convert at the same rate; the deterioration happens before the click.</p><hr/><span>Current CPA</span><strong>${issue.current.cpa.toFixed(2)}</strong><span>Baseline CPA</span><strong>${issue.baseline.cpa.toFixed(2)}</strong>{action && <small>{action.decision_reason}</small>}</aside></div></> }

function Approvals({ state, busy, decide }: { state: DemoState; busy: boolean; decide: (value: 'approved' | 'rejected') => void }) { const action = state.actions[0]; return <><PageHeading eyebrow="HUMAN REVIEW" title="Approvals" body="High-impact proposals pause here before any connector write."/>{action ? <ActionProposal action={action} busy={busy} onDecide={decide}/> : <Empty title="Nothing awaiting review" body="Run the agent to produce an evidence-backed creative proposal."/>}</> }

function Campaigns({ state }: { state: DemoState }) { return <><PageHeading eyebrow="PERFORMANCE" title="Campaigns" body="Thirty days of reproducible campaign data."/><section className="panel table-wrap"><table><thead><tr><th>Campaign</th><th>Channel</th><th>Spend</th><th>Revenue</th><th>ROAS</th><th>Status</th></tr></thead><tbody>{state.campaigns.map(c => <tr key={c.id}><td><strong>{c.name}</strong></td><td>{c.channel}</td><td>{money(c.spend)}</td><td>{money(c.revenue)}</td><td>{c.roas === null ? '—' : `${c.roas.toFixed(2)}×`}</td><td><Status>{c.status}</Status></td></tr>)}</tbody></table></section></> }

function Experiments({ state, busy, simulate }: { state: DemoState; busy: boolean; simulate: () => void }) { const canSimulate = state.actions[0]?.status === 'applied'; return <><PageHeading eyebrow="CLOSED LOOP" title="Experiments" body="Compare the diagnosed week with the injected post-action week." action={<button className="primary" disabled={!canSimulate || busy} onClick={simulate}>{busy ? <LoaderCircle className="spin"/> : <FlaskConical/>}{busy ? 'Simulating…' : 'Simulate next week'}</button>}/>{state.experiments[0] ? <BeforeAfterCard experiment={state.experiments[0]}/> : <Empty title={canSimulate ? 'Ready to measure' : 'No experiment to measure'} body={canSimulate ? 'The creative is approved. Inject the deterministic next-week recovery data.' : 'Approve the proposed creative before simulating its result.'}/>}</> }

function TrendsPage() {
  const { data, error } = useResource(api.trends)
  if (error) return <Empty title="Trends unavailable" body={error}/>
  if (!data) return <Empty title="Loading trends" body="Reading thirty days of campaign snapshots."/>
  return <><PageHeading eyebrow={`PERFORMANCE OVER TIME · ${data.window}`} title="Trends" body="Daily spend and attributed revenue, summed across all four campaigns."/>
    <div className="page-stack">
      <section className="panel"><div className="panel-heading"><div><h2>Spend and revenue</h2><p>Each point is one day of summed campaign snapshots</p></div></div><SpendRevenueChart days={data.days}/></section>
      <section className="panel"><div className="panel-heading"><div><h2>Direction of travel</h2><p>Last seven days compared with the seven before</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Campaign</th><th>Channel</th><th>30-day spend</th><th>ROAS (7d)</th><th>CTR change</th><th>CPA change</th></tr></thead>
          <tbody>{data.campaigns.map(row => <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.channel}</td><td>{money(row.spend)}</td>
            <td>{row.roas === null ? <span className="muted">—</span> : `${row.roas.toFixed(2)}×`}</td>
            <td><Delta value={row.ctr_change}/></td><td><Delta value={row.cpa_change} goodWhenNegative/></td></tr>)}</tbody></table></div>
      </section>
    </div></>
}

function OrganicPage() {
  const { data, error } = useResource(api.organic)
  if (error) return <Empty title="Organic revenue unavailable" body={error}/>
  if (!data) return <Empty title="Loading organic revenue" body="Reading the Shopify order history."/>
  return <><PageHeading eyebrow="SHOPIFY REVENUE" title="Organic" body="Revenue from orders that carried no campaign attribution."/>
    <section className="metrics">
      <article><span>Organic revenue</span><strong>{money(data.organic_revenue)}</strong><small>{data.organic_orders} orders</small></article>
      <article><span>Share of revenue</span><strong>{data.organic_share.toFixed(1)}%</strong><small>of {money(data.total_revenue)} total</small></article>
      <article><span>Organic AOV</span><strong>${data.organic_aov.toFixed(2)}</strong><small>Average order value</small></article>
      <article><span>Repeat customers</span><strong>{data.organic_repeat_rate.toFixed(1)}%</strong><small>of organic orders</small></article>
    </section>
    <div className="page-stack">
      <section className="panel"><div className="panel-heading"><div><h2>Organic against paid</h2><p>Daily Shopify revenue split by attribution</p></div></div><OrganicSplitChart daily={data.daily}/></section>
      <section className="panel"><div className="panel-heading"><div><h2>Where revenue came from</h2><p>Every order grouped by its UTM campaign</p></div></div>
        <div className="table-wrap"><table><thead><tr><th>Source</th><th>Channel</th><th>Orders</th><th>Revenue</th><th>Share</th><th>AOV</th></tr></thead>
          <tbody>{data.sources.map(row => <tr key={row.source}><td><strong>{row.source}</strong></td><td>{row.channel}</td><td>{row.orders}</td>
            <td>{money(row.revenue)}</td><td>{row.share.toFixed(1)}%</td><td>${row.aov.toFixed(2)}</td></tr>)}</tbody></table></div>
      </section>
    </div></>
}

function GuardrailSettings({ state, busy, save }: { state: DemoState; busy: boolean; save: (value: Guardrails) => void }) { const [form, setForm] = useState(state.guardrails); return <><PageHeading eyebrow="SAFETY POLICY" title="Guardrails" body="These limits are enforced before actions reach a connector."/><section className="panel settings-form"><label>Maximum daily spend ($)<input type="number" value={form.max_daily_spend} onChange={e => setForm({ ...form, max_daily_spend: Number(e.target.value) })}/></label><label>Maximum reallocation (%)<input type="number" value={form.max_reallocation_pct} onChange={e => setForm({ ...form, max_reallocation_pct: Number(e.target.value) })}/></label><label>Minimum confidence<input type="number" step="0.05" value={form.min_confidence} onChange={e => setForm({ ...form, min_confidence: Number(e.target.value) })}/></label><label>Autonomy level<select value={form.autonomy_level} onChange={e => setForm({ ...form, autonomy_level: e.target.value as Guardrails['autonomy_level'] })}><option value="recommend">Recommend only</option><option value="assisted">Assisted</option><option value="auto">Automatic</option></select></label><button className="primary" disabled={busy} onClick={() => save(form)}>{busy ? 'Saving…' : 'Save guardrails'}</button><p className="form-note"><ShieldCheck/> Single-campaign increases remain capped at 25% per day in code.</p></section></> }

export default function App() {
  const [landing, setLanding] = useState(true), [page, setPage] = useState<Page>('Overview')
  const [state, setState] = useState<DemoState | null>(null), [detail, setDetail] = useState<Issue | null>(null)
  const [busy, setBusy] = useState(''), [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null)
  const perform = async (name: string, task: () => Promise<DemoState>, success: string) => { setBusy(name); try { const next = await task(); setState(next); setToast({ text: success }); return next } catch (error) { setToast({ text: error instanceof Error ? error.message : 'Unexpected error', error: true }) } finally { setBusy('') } }
  useEffect(() => { api.state().then(setState).catch(() => setToast({ text: 'Agent service is unreachable. Start it with make dev-agent.', error: true })) }, [])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 4500); return () => window.clearTimeout(timer) }, [toast])
  if (landing) return <Landing launch={() => setLanding(false)}/>
  if (!state) return <div className="boot"><LoaderCircle className="spin"/><p>Connecting to the agent service…</p>{toast?.error && <button className="secondary" onClick={() => window.location.reload()}>Retry</button>}</div>
  const run = async () => { const next = await perform('run', api.run, 'Agent found one high-confidence issue and generated a creative.'); if (next) { setPage('Issues'); setDetail(null) } }
  const decide = async (decision: 'approved' | 'rejected') => { const action = state.actions[0]; if (!action) return; await perform('decision', () => api.decide(action.id, decision), decision === 'approved' ? 'Creative approved and applied in simulation.' : 'Proposal rejected; no change was made.') }
  return <div className="app-shell"><aside className="sidebar"><button className="brand" onClick={() => { setPage('Overview'); setDetail(null) }}><Mark size={31}/><span>Journey <b>Edge</b></span></button><nav>{nav.map(({ page: item, icon: Icon }) => <button key={item} className={page === item && !detail ? 'active' : ''} onClick={() => { setPage(item); setDetail(null) }}><Icon/>{item}{item === 'Approvals' && state.actions[0]?.status === 'proposed' && <i>1</i>}</button>)}</nav><div className="sidebar-foot"><span className="live-dot"/> Simulation mode<small>External ad writes disabled</small></div></aside>
    <main className="workspace"><header className="topbar"><div><strong>Brew &amp; Bloom</strong><span>/ Marketing workspace</span></div><div className="top-actions"><button className="secondary small" disabled={!!busy} onClick={() => { setDetail(null); void perform('reset', api.reset, 'Demo reset and ready to run again.') }}><RotateCcw/> Reset</button><button className="primary" disabled={!!busy} onClick={() => void run()}>{busy === 'run' ? <LoaderCircle className="spin"/> : <Play/>}{busy === 'run' ? 'Analyzing…' : 'Run agent'}</button></div></header>
      <div className="content">{detail ? <IssueDetail issue={detail} action={state.actions[0]} back={() => setDetail(null)} goApproval={() => { setDetail(null); setPage('Approvals') }}/> : page === 'Overview' ? <Overview state={state} openIssue={issue => { setDetail(issue); setPage('Issues') }}/> : page === 'Issues' ? <Issues state={state} select={setDetail}/> : page === 'Approvals' ? <Approvals state={state} busy={busy === 'decision'} decide={decide}/> : page === 'Campaigns' ? <Campaigns state={state}/> : page === 'Trends' ? <TrendsPage/> : page === 'Organic' ? <OrganicPage/> : page === 'Experiments' ? <Experiments state={state} busy={busy === 'simulate'} simulate={() => void perform('simulate', api.simulate, 'Next-week data injected. Recovery is measured and confirmed.')}/> : page === 'Chat' ? <><PageHeading eyebrow="READ-ONLY ASSISTANT" title="Ask the data" body="The chat can explain only evidence already loaded into the workflow."/><ChatPanel ask={api.chat}/></> : <GuardrailSettings state={state} busy={busy === 'guardrails'} save={async values => { setBusy('guardrails'); try { const guardrails = await api.saveGuardrails(values); setState({ ...state, guardrails }); setToast({ text: 'Guardrails saved.' }) } catch (error) { setToast({ text: error instanceof Error ? error.message : 'Save failed', error: true }) } finally { setBusy('') } }}/>}</div>
    </main>{toast && <div className={`toast ${toast.error ? 'error' : ''}`}>{toast.error ? <AlertTriangle/> : <CheckCircle2/>}{toast.text}</div>}</div>
}
