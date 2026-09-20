import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, LockKeyhole, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import type { Action, Campaign, ChatAnswer, DemoState, Experiment, Issue, Organic, Trends } from './types'
import { CAMPAIGN_PURPOSE, causeHeading, displayChannel, displaySeverity, displayStatus, money } from './labels'

export function Status({ children }: { children: string }) {
  return <span className={`status ${children.toLowerCase().replaceAll(' ', '-')}`}>{children}</span>
}

type SyncKind = 'ready' | 'syncing' | 'behind'

function compactAgo(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function SyncChip({ kind = 'ready', minutesAgo = 12, behind = 0 }: { kind?: SyncKind; minutesAgo?: number; behind?: number }) {
  const exact = `${minutesAgo} min ago`
  const title = kind === 'ready' ? `Up to date · ${exact}` : kind === 'syncing' ? `Syncing · ${exact}` : `Behind ${behind} · ${exact}`
  const visible = kind === 'ready' ? compactAgo(minutesAgo) : kind === 'syncing' ? 'Syncing' : `Behind ${behind}`
  return (
    <span className={`uptodate is-${kind}`} title={title} role="status" aria-label={title}>
      <span className="live" aria-hidden="true" />
      {visible}
    </span>
  )
}

export function IssueCard({ issue, onClick, phase, action, onApprove, approving = false }: {
  issue: Issue
  onClick: () => void
  phase?: string
  action?: Action
  onApprove?: () => Promise<void>
  approving?: boolean
}) {
  const [optimistic, setOptimistic] = useState<string | null>(null)
  const shown = optimistic ? { ...issue, status: optimistic } : issue
  const status = displayStatus(shown, phase ?? '', action)
  const canApprove = Boolean(onApprove && action && action.issue_id === issue.id && action.status === 'proposed' && !optimistic)
  const pending = approving
  return (
    <article className="issue-card">
      <button type="button" className="issue-card-main" onClick={onClick}>
        <div className="issue-top"><Status>{displaySeverity(shown.severity)}</Status><span className="muted">{displayChannel(shown.channel)} · {status}</span></div>
        <h3>{shown.title}</h3>
        <p>{shown.summary}</p>
        <div className="issue-bottom"><span>{shown.campaign}</span><strong>{shown.confidence}% sure</strong></div>
      </button>
      {canApprove && (
        <div className="issue-actions">
          <button
            type="button"
            className="primary"
            disabled={pending}
            onClick={() => {
              setOptimistic('Approved')
              void onApprove!().catch(() => setOptimistic(null))
            }}
          >
            {pending ? 'Approving…' : 'Approve'}
          </button>
        </div>
      )}
    </article>
  )
}

export function MetricSparkline({ values }: { values: number[] }) {
  const data = values.map((value, index) => ({ day: index + 1, value }))
  return <div className="sparkline" aria-label="CTR trend over fourteen days"><ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data}><defs><linearGradient id="trend" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#356f62" stopOpacity={.28}/><stop offset="1" stopColor="#356f62" stopOpacity={0}/></linearGradient></defs>
      <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'CTR']} labelFormatter={(label) => `Day ${label}`}/>
      <Area type="monotone" dataKey="value" stroke="#356f62" strokeWidth={3} fill="url(#trend)"/>
    </AreaChart>
  </ResponsiveContainer></div>
}

export function FatigueScoreGauge({ score }: { score: number }) {
  const degrees = Math.round(score * 360)
  return <div className="gauge" style={{ background: `conic-gradient(#d9704d ${degrees}deg, #e9eee9 ${degrees}deg)` }}>
    <div><strong>{Math.round(score * 100)}</strong><span>/ 100</span></div>
  </div>
}

export function DiagnosisPanel({ issue }: { issue: Issue }) {
  return <section className="panel diagnosis"><div className="panel-heading"><div className="stack-head"><p className="eyebrow">COMBINED-METRIC DIAGNOSIS</p><h2>{causeHeading(issue.type)}</h2></div><FatigueScoreGauge score={issue.score}/></div>
    <p className="narrative">{issue.narrative}</p><div className="chips">{issue.evidence.map(item => <span key={item}>{item}</span>)}</div>
    <MetricSparkline values={issue.trend}/><p className="chart-note">Fourteen-day CTR trend · derived from raw impressions and clicks</p>
  </section>
}

export function CreativePreview({ action }: { action: Action }) {
  const creative = action.creative
  if (!creative?.headline) return null
  return <section className="creative-preview"><div className="creative-art"><span>BREW<br/>&amp; BLOOM</span><div className="cup">☕</div><small>{creative.variant_label}</small></div>
    <div className="creative-copy"><span className="eyebrow">VARIANT · {creative.variant_label}</span><h3>{creative.headline}</h3><p>{creative.primary_text}</p><button type="button">{creative.call_to_action}</button><small className="creative-direction">Image direction: {creative.image_prompt}</small></div>
  </section>
}

export function GuardrailBanner({ action }: { action: Action }) {
  const passed = action.guardrail_passed !== false
  return <div className={`guardrail-banner ${passed ? '' : 'blocked'}`}><ShieldCheck width={18} height={18} /><div><strong>{passed ? 'Guardrails checked' : 'Spend cap blocked this write'}</strong><span>{action.guardrail_reason || `$${action.spend_change} spend change · confidence ${Math.round(action.confidence * 100)}%`}</span></div></div>
}

export function ActionProposal({ action, busy, onDecide, onView }: { action: Action; busy: boolean; onDecide: (decision: 'approved' | 'rejected') => void; onView?: () => void }) {
  const canDecide = action.status === 'proposed'
  const recommended = action.status === 'recommended' || action.decision === 'recommend_only'
  const blocked = action.guardrail_passed === false
  if (onView) {
    return (
      <section className="attention-banner">
        <div className="stack-head">
          <p className="eyebrow">{recommended ? 'RECOMMENDATION' : blocked ? 'BLOCKED BY YOUR LIMITS' : 'WAITING ON YOU'}</p>
          <h2>{recommended ? 'Held as a recommendation' : blocked ? 'Your spend cap stopped this write' : 'Launch refreshed creative'}</h2>
          <p>{action.rationale}</p>
        </div>
        <button type="button" className="primary" onClick={onView}>See what we suggest</button>
      </section>
    )
  }
  return (
    <section className="panel action-proposal">
      <div className="row"><p className="eyebrow">{recommended ? 'RECOMMENDATION' : 'SEE WHAT WE SUGGEST'}</p><Status>{action.risk_tier}</Status></div>
      <h2>{recommended ? 'Held as a recommendation' : 'Launch refreshed creative'}</h2>
      <p className="proposal-copy">{action.rationale}</p>
      <p className="muted">{action.decision_reason}</p>
      <GuardrailBanner action={action} /><CreativePreview action={action} />
      {canDecide ? (
        <div className="decision-actions">
          <button className="secondary" disabled={busy} onClick={() => onDecide('rejected')}><X width={16} height={16} /> No thanks</button>
          <button className="primary" disabled={busy} onClick={() => onDecide('approved')}><Check width={16} height={16} /> {busy ? 'Recording…' : 'Approve creative'}</button>
        </div>
      ) : (
        <div className="decision-complete"><Check width={16} height={16} /> {recommended ? 'Policy stopped this as a recommendation. Nothing was sent to an ad account.' : `Action ${action.status}. The decision is recorded in the activity trail.`}</div>
      )}
    </section>
  )
}

const fmt = (metric: string, value: number) => metric === 'ctr' || metric === 'cvr' ? `${(value * 100).toFixed(2)}%` : metric === 'frequency' ? `${value.toFixed(2)}×` : `$${value.toFixed(2)}`

export function BeforeAfterCard({ experiment }: { experiment: Experiment }) {
  const recovered = experiment.verdict === 'confirmed'
  return (
    <section className="panel result-card">
      <div className="result-head">
        <div className="stack-head">
          <Status>{experiment.verdict}</Status>
          <h2>{recovered ? 'The next week of data confirmed the change' : 'The next week of data was inconclusive'}</h2>
          <p>{experiment.hypothesis}</p>
        </div>
        <div className="recovery">
          <strong>{(experiment.changes.cpa * 100).toFixed(1)}%</strong>
          <span>CPA change</span>
        </div>
      </div>
      <div className="before-after">
        {(['cpa', 'ctr', 'cpm', 'frequency'] as const).map(metric => (
          <div key={metric} className="ba-metric">
            <span className="ba-label">{metric.toUpperCase()}</span>
            <div className="ba-pair">
              <div>
                <small>Before</small>
                <strong>{fmt(metric, experiment.before[metric])}</strong>
              </div>
              <b aria-hidden="true">→</b>
              <div>
                <small>After</small>
                <strong>{fmt(metric, experiment.after[metric])}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ChatPanel({ ask }: { ask: (message: string) => Promise<ChatAnswer> }) {
  const [message, setMessage] = useState('Why is this creative fatigue instead of a landing page problem?')
  const [answer, setAnswer] = useState<ChatAnswer | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async () => { if (!message.trim()) return; setBusy(true); try { setAnswer(await ask(message)) } finally { setBusy(false) } }
  return <section className="chat-panel panel"><div className="chat-intro"><Sparkles width={18} height={18} /><div><h2>Ask your campaign data</h2><p>Answers use only loaded metrics and guardrails.</p></div></div>
    <div className="chat-answer">{answer ? <><p>{answer.answer}</p><div className="chips">{answer.evidence_cited.map(x => <span key={x}>{x}</span>)}</div></> : <div className="empty compact">Ask about the diagnosis, spend cap, or measured result.</div>}</div>
    <div className="chat-input">
      <textarea
        rows={3}
        value={message}
        onChange={e => setMessage(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit() } }}
        aria-label="Your question"
      />
      <button className="primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Thinking…' : <><Send width={16} height={16} /> Ask</>}</button>
    </div>
  </section>
}

const shortDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
const dollars = (value: number) => `$${Math.round(value).toLocaleString('en-US')}`
const axis = { stroke: '#8a9994', fontSize: 11, tickLine: false, axisLine: false }

/** Signed change rendered with the same positive/negative colouring the tables use. */
export function Delta({ value, goodWhenNegative }: { value: number | null; goodWhenNegative?: boolean }) {
  if (value === null) return <span className="muted">—</span>
  const good = goodWhenNegative ? value < 0 : value > 0
  return <strong className={Math.abs(value) < 0.005 ? 'muted' : good ? 'delta-good' : 'delta-bad'}>{(value * 100).toFixed(1)}%</strong>
}

export function SpendRevenueChart({ days }: { days: Trends['days'] }) {
  return <div className="chart"><ResponsiveContainer width="100%" height="100%">
    <AreaChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#356f62" stopOpacity={.3}/><stop offset="1" stopColor="#356f62" stopOpacity={0}/></linearGradient>
        <linearGradient id="spd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9704d" stopOpacity={.25}/><stop offset="1" stopColor="#d9704d" stopOpacity={0}/></linearGradient>
      </defs>
      <CartesianGrid stroke="#e7ece7" vertical={false}/>
      <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={28} {...axis}/>
      <YAxis tickFormatter={dollars} width={58} {...axis}/>
      <Tooltip formatter={(value, name) => [dollars(Number(value)), name === 'revenue' ? 'Revenue' : 'Spend']} labelFormatter={label => shortDate(String(label))}/>
      <Legend formatter={value => value === 'revenue' ? 'Attributed revenue' : 'Ad spend'} iconType="plainline" wrapperStyle={{ fontSize: 12 }}/>
      <Area type="monotone" dataKey="revenue" stroke="#356f62" strokeWidth={2.5} fill="url(#rev)" isAnimationActive={false}/>
      <Area type="monotone" dataKey="spend" stroke="#d9704d" strokeWidth={2.5} fill="url(#spd)" isAnimationActive={false}/>
    </AreaChart>
  </ResponsiveContainer></div>
}

export function OrganicSplitChart({ daily }: { daily: Organic['daily'] }) {
  return <div className="chart"><ResponsiveContainer width="100%" height="100%">
    <AreaChart data={daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid stroke="#e7ece7" vertical={false}/>
      <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={28} {...axis}/>
      <YAxis tickFormatter={dollars} width={58} {...axis}/>
      <Tooltip formatter={(value, name) => [dollars(Number(value)), name === 'organic' ? 'Organic / direct' : 'Campaign-attributed']} labelFormatter={label => shortDate(String(label))}/>
      <Legend formatter={value => value === 'organic' ? 'Organic / direct' : 'Campaign-attributed'} iconType="plainline" wrapperStyle={{ fontSize: 12 }}/>
      <Area type="monotone" dataKey="attributed" stackId="revenue" stroke="#356f62" strokeWidth={2} fill="#356f62" fillOpacity={.22} isAnimationActive={false}/>
      <Area type="monotone" dataKey="organic" stackId="revenue" stroke="#8fbfa8" strokeWidth={2} fill="#8fbfa8" fillOpacity={.35} isAnimationActive={false}/>
    </AreaChart>
  </ResponsiveContainer></div>
}

export function SafetyCard() {
  return <aside className="safety-card"><LockKeyhole width={18} height={18} /><div><strong>Human control is active</strong><p>Creative launches and material budget changes pause for review before any connector write.</p></div></aside>
}

export function Term({ word, means }: { word: string; means: string }) {
  return <span className="term" tabIndex={0}>{word}<span className="term-tip" role="tooltip">{means}</span></span>
}

export function Metric({ name, value, detail, means, tone }: { name: string; value: string; detail: string; means?: string; tone?: 'flat' | 'alert' }) {
  return (
    <div className="metric">
      <p>{means ? <Term word={name} means={means} /> : name}</p>
      <strong>{value}</strong>
      <span className={tone === 'alert' ? 'alert-text' : tone === 'flat' ? 'flat-text' : 'positive'}>{detail}</span>
    </div>
  )
}

export function Timeline({ events }: { events: DemoState['events'] }) {
  if (!events.length) return <p className="muted">The activity trail fills in when you run the agent.</p>
  return (
    <ol className="timeline">
      {events.slice(0, 8).map(item => (
        <li key={`${item.time}-${item.event}`}><span className="dot" /><div><strong>{item.event}</strong><p>{item.detail}</p><small>{item.time.slice(11, 16)} UTC</small></div></li>
      ))}
    </ol>
  )
}

export function CampaignTable({ campaigns, onOpen }: { campaigns: Campaign[]; onOpen: (id: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Spent</th>
            <th><Term word="Earned per $1" means="For every $1 this campaign spent, how much came back as sales. Marketers call this ROAS." /></th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(row => (
            <tr key={row.id} className="campaign-row" onClick={() => onOpen(row.id)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(row.id) } }}>
              <td><strong>{row.name}</strong><small>{displayChannel(row.channel)} · {CAMPAIGN_PURPOSE[row.id] ?? row.channel}</small></td>
              <td>{money(row.spend)}</td>
              <td>{row.roas == null ? 'No ad cost' : money(row.roas, 2)}</td>
              <td><Status>{row.status}</Status></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Empty({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="empty panel">
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="primary" onClick={onAction}>{action}</button>
    </div>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="page-status">
      <div className="spinner" role="status" aria-label={label} />
      <p>{label}</p>
    </div>
  )
}

export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="page-status">
      <p>{message}</p>
      <button className="primary" type="button" onClick={onRetry}>Try again</button>
    </div>
  )
}
