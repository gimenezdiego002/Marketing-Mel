import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, LockKeyhole, Send, ShieldCheck, Sparkles, X } from 'lucide-react'
import type { Action, ChatAnswer, Experiment, Issue, Organic, Trends } from './types'

export function Status({ children }: { children: string }) {
  return <span className={`status status-${children.toLowerCase().replaceAll(' ', '-')}`}>{children}</span>
}

export function IssueCard({ issue, onClick }: { issue: Issue; onClick: () => void }) {
  return <button className="issue-card" onClick={onClick}>
    <div className="row"><Status>{issue.severity}</Status><span className="muted">{issue.channel} · {issue.status}</span></div>
    <h3>{issue.title}</h3><p>{issue.summary}</p>
    <div className="row issue-foot"><span>{issue.campaign}</span><strong>{issue.confidence}% confidence →</strong></div>
  </button>
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
  return <section className="panel diagnosis"><div className="panel-heading"><div><p className="eyebrow">COMBINED-METRIC DIAGNOSIS</p><h2>Why the agent chose creative fatigue</h2></div><FatigueScoreGauge score={issue.score}/></div>
    <p className="narrative">{issue.narrative}</p><div className="chips">{issue.evidence.map(item => <span key={item}>{item}</span>)}</div>
    <MetricSparkline values={issue.trend}/><p className="chart-note">Fourteen-day CTR trend · derived from raw impressions and clicks</p>
  </section>
}

export function CreativePreview({ action }: { action: Action }) {
  const creative = action.creative
  return <section className="creative-preview"><div className="creative-art"><span>BREW<br/>&amp; BLOOM</span><div className="cup">☕</div><small>NEW MORNING RITUAL</small></div>
    <div className="creative-copy"><span className="eyebrow">VARIANT · {creative.variant_label}</span><h3>{creative.headline}</h3><p>{creative.primary_text}</p><button>{creative.call_to_action}</button><small>Image direction: {creative.image_prompt}</small></div>
  </section>
}

export function GuardrailBanner({ action }: { action: Action }) {
  return <div className="guardrail-banner"><ShieldCheck/><div><strong>Guardrails passed</strong><span>$0 spend change · high-risk launch held for approval · confidence {Math.round(action.confidence * 100)}%</span></div></div>
}

export function ActionProposal({ action, busy, onDecide }: { action: Action; busy: boolean; onDecide: (decision: 'approved' | 'rejected') => void }) {
  const finished = action.status !== 'proposed'
  return <section className="panel action-proposal"><div className="row"><p className="eyebrow">PROPOSED ACTION</p><Status>{action.risk_tier}</Status></div><h2>Launch refreshed creative</h2><p>{action.rationale}</p>
    <GuardrailBanner action={action}/><CreativePreview action={action}/>
    {finished ? <div className="decision-complete"><Check/> Action {action.status}. The decision is recorded in the audit trail.</div> : <div className="decision-actions"><button className="secondary" disabled={busy} onClick={() => onDecide('rejected')}><X/> Reject</button><button className="primary" disabled={busy} onClick={() => onDecide('approved')}><Check/> {busy ? 'Recording…' : 'Approve creative'}</button></div>}
  </section>
}

const fmt = (metric: string, value: number) => metric === 'ctr' || metric === 'cvr' ? `${(value * 100).toFixed(2)}%` : metric === 'frequency' ? `${value.toFixed(2)}×` : `$${value.toFixed(2)}`

export function BeforeAfterCard({ experiment }: { experiment: Experiment }) {
  return <section className="panel result-card"><div className="result-head"><div><Status>{experiment.verdict}</Status><h2>Creative refresh restored efficiency</h2><p>{experiment.hypothesis}</p></div><div className="recovery"><strong>{(experiment.changes.cpa * 100).toFixed(1)}%</strong><span>CPA recovery</span></div></div>
    <div className="before-after">{(['cpa', 'ctr', 'cpm', 'frequency'] as const).map(metric => <div key={metric}><span>{metric.toUpperCase()}</span><div><small>Before</small><strong>{fmt(metric, experiment.before[metric])}</strong></div><b>→</b><div><small>After</small><strong>{fmt(metric, experiment.after[metric])}</strong></div></div>)}</div>
  </section>
}

export function ChatPanel({ ask }: { ask: (message: string) => Promise<ChatAnswer> }) {
  const [message, setMessage] = useState('Why is this creative fatigue instead of a landing page problem?')
  const [answer, setAnswer] = useState<ChatAnswer | null>(null)
  const [busy, setBusy] = useState(false)
  const submit = async () => { if (!message.trim()) return; setBusy(true); try { setAnswer(await ask(message)) } finally { setBusy(false) } }
  return <section className="chat-panel panel"><div className="chat-intro"><Sparkles/><div><h2>Ask your campaign data</h2><p>Answers use only loaded metrics and guardrails.</p></div></div>
    <div className="chat-answer">{answer ? <><p>{answer.answer}</p><div className="chips">{answer.evidence_cited.map(x => <span key={x}>{x}</span>)}</div></> : <div className="empty compact">Ask about the diagnosis, spend cap, or measured result.</div>}</div>
    <div className="chat-input"><input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && void submit()}/><button className="primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Thinking…' : <><Send/> Ask</>}</button></div>
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
  return <aside className="safety-card"><LockKeyhole/><div><strong>Human control is active</strong><p>Creative launches and material budget changes pause for review before any connector write.</p></div></aside>
}
