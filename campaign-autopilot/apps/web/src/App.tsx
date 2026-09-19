import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { campaigns, issues as seedIssues, type Campaign, type Issue } from './data'
import { approveAction, getIssues, saveSpendCap } from './api'
import { DotField, LogoCloud, Mark } from './brand'
import {
  ApproveArt, CastCard, ConceptCard, EmailSticker, ExplainArt, GlassCard, GoogleAdSticker,
  MetaAdSticker, PhotoSticker, Scene, ShopifyOrderSticker, SpotArt, cast, img,
} from './visuals'

type Page = 'Overview' | 'To do' | 'Decisions' | 'Campaigns' | 'Experiments' | 'Ask a question' | 'Settings'
type Filter = 'all' | 'waiting' | 'fix' | 'meta' | 'email'
type Decision = 'open' | 'approved' | 'declined'
type Panel = 'none' | 'help' | 'account' | 'audit'
type ChatTurn = { who: 'you' | 'edge'; text: string }

const nav: Page[] = ['Overview', 'To do', 'Decisions', 'Campaigns', 'Experiments', 'Ask a question', 'Settings']
type AppState = {
  go: (page: Page) => void
  openIssue: (issue: Issue) => void
  openCampaign: (name: string) => void
  backToSite: () => void
  toast: (msg: string) => void
  setPanel: (panel: Panel) => void
  issues: Issue[]
  decision: Decision
  setDecision: (value: Decision) => void
  approve: () => Promise<void>
  looking: string[]
  lookInto: (id: string) => void
  spendCap: number
  setSpendCap: (value: number) => void
}

function Status({ children }: { children: string }) {
  return <span className={`status ${children.toLowerCase().replaceAll(' ', '-')}`}>{children}</span>
}

type SyncKind = 'ready' | 'syncing' | 'behind'

function compactAgo(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function SyncChip({ kind = 'ready', minutesAgo = 12, behind = 0 }: { kind?: SyncKind; minutesAgo?: number; behind?: number }) {
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

function Term({ word, means }: { word: string; means: string }) {
  return <span className="term" tabIndex={0}>{word}<span className="term-tip" role="tooltip">{means}</span></span>
}

function IssueCard({ issue, select }: { issue: Issue; select: (issue: Issue) => void }) {
  return (
    <button className="issue-card" onClick={() => select(issue)}>
      <div className="issue-top"><Status>{issue.severity}</Status><span className="muted">{issue.channel} · {issue.status}</span></div>
      <h3>{issue.title}</h3>
      <p>{issue.summary}</p>
      <div className="issue-bottom"><span>{issue.campaign}</span><strong>{issue.confidence}% sure</strong></div>
    </button>
  )
}

function Overview({ ctx, select }: { ctx: AppState; select: (issue: Issue) => void }) {
  const waiting = ctx.issues.filter(i => i.status === 'Needs your OK').length
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">BREW & BLOOM · LAST 30 DAYS</p>
          <h1>Good afternoon, Mel.</h1>
          <p className="subtitle">Here’s what needs your attention today.</p>
        </div>
        <p className="period-chip">Sep 1 – Sep 30</p>
      </section>
      <section className="metrics">
        <Metric name="Money your store made" value="$40,280" detail="8.4% more than last month" />
        <Metric name="Money you spent on ads" value="$19,480" detail="4.1% more than last month" tone="flat" />
        <Metric name="Earned per $1 of ads" value="$3.70" detail="20¢ more than last month" means="For every $1 you put into ads, this is how much came back as sales. Marketers call this ROAS." />
        <Metric name="On your list" value={String(ctx.issues.length)} detail={waiting ? `${waiting} waiting on you` : 'Nothing waiting on you'} tone={waiting ? 'alert' : undefined} />
      </section>
      <section className="split">
        <div className="panel">
          <div className="panel-title">
            <div><h2>Needs your attention</h2><p>Most important first</p></div>
            <button className="text-button" onClick={() => ctx.go('To do')}>See everything</button>
          </div>
          <div className="issue-list">{ctx.issues.slice(0, 3).map(i => <IssueCard key={i.id} issue={i} select={select} />)}</div>
        </div>
        <div className="panel activity">
          <div className="panel-title"><div><h2>What we’ve been doing</h2><p>Every step, with the numbers behind it</p></div></div>
          <Timeline decision={ctx.decision} />
        </div>
      </section>
      <section className="panel campaign-panel">
        <div className="panel-title">
          <div><h2>How your campaigns are doing</h2><p>Compared with what’s normal for you</p></div>
          <button className="text-button" onClick={() => ctx.go('Campaigns')}>See all campaigns</button>
        </div>
        <CampaignTable onOpen={ctx.openCampaign} />
      </section>
    </>
  )
}

function Metric({ name, value, detail, means, tone }: { name: string; value: string; detail: string; means?: string; tone?: 'flat' | 'alert' }) {
  return (
    <div className="metric">
      <p>{means ? <Term word={name} means={means} /> : name}</p>
      <strong>{value}</strong>
      <span className={tone === 'alert' ? 'alert-text' : tone === 'flat' ? 'flat-text' : 'positive'}>{detail}</span>
    </div>
  )
}

function Timeline({ decision }: { decision: Decision }) {
  return (
    <ol className="timeline">
      {decision === 'approved' ? (
        <li><span className="dot"/><div><strong>Change is live</strong><p>Two new Facebook images are running. We’ll check the numbers as they come in.</p><small>Just now</small></div></li>
      ) : decision === 'declined' ? (
        <li><span className="dot warning"/><div><strong>You said no, for now</strong><p>We left the Facebook ad as it is. You can change your mind from Decisions.</p><small>Just now</small></div></li>
      ) : (
        <li><span className="dot warning"/><div><strong>Waiting for your OK</strong><p>Swap in fresh images for your Facebook ad</p><small>12 minutes ago</small></div></li>
      )}
      <li><span className="dot"/><div><strong>Worked out the reason</strong><p>Too many people have seen the same ad too often</p><small>18 minutes ago</small></div></li>
      <li><span className="dot"/><div><strong>Checked your accounts</strong><p>Shopify, Facebook, Google and email are all up to date</p><small>42 minutes ago</small></div></li>
    </ol>
  )
}

function CampaignTable({ onOpen }: { onOpen: (name: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Spent</th>
            <th><Term word="Earned per $1" means="For every $1 this campaign spent, how much came back as sales. Marketers call this ROAS." /></th>
            <th>Change vs. last month</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map(row => (
            <tr key={row.name} className="campaign-row" onClick={() => onOpen(row.name)} tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(row.name) } }}>
              <td><strong>{row.name}</strong><small>{row.channel} · {row.purpose}</small></td>
              <td>{row.spend}</td>
              <td>{row.earned}</td>
              <td><span className={row.trend.startsWith('+') ? 'positive' : row.trend.startsWith('-') ? 'negative' : ''}>{row.trend}</span></td>
              <td><Status>{row.status}</Status></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Issues({ ctx, select }: { ctx: AppState; select: (issue: Issue) => void }) {
  const [filter, setFilter] = useState<Filter>('all')
  const shown = ctx.issues.filter(issue => {
    if (filter === 'waiting') return issue.status === 'Needs your OK'
    if (filter === 'fix') return issue.severity === 'Fix first'
    if (filter === 'meta') return issue.channel.includes('Facebook')
    if (filter === 'email') return issue.channel === 'Email'
    return true
  })
  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `Everything · ${ctx.issues.length}` },
    { id: 'waiting', label: `Waiting on you · ${ctx.issues.filter(i => i.status === 'Needs your OK').length}` },
    { id: 'fix', label: `Fix first · ${ctx.issues.filter(i => i.severity === 'Fix first').length}` },
    { id: 'meta', label: 'Facebook & Instagram' },
    { id: 'email', label: 'Email' },
  ]
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">YOUR TO-DO LIST</p>
          <h1>What needs your attention</h1>
          <p className="subtitle">Every suggestion comes with the numbers that led to it.</p>
        </div>
      </section>
      <div className="filters" role="tablist" aria-label="Filter to-dos">
        {filters.map(item => (
          <button key={item.id} className={`filter ${filter === item.id ? 'active' : ''}`} onClick={() => setFilter(item.id)}>{item.label}</button>
        ))}
      </div>
      {shown.length ? (
        <div className="issues-grid">{shown.map(i => <IssueCard key={i.id} issue={i} select={select} />)}</div>
      ) : (
        <Empty title="Nothing in this view" text="Try another filter, or go back to everything." action="Show everything" onAction={() => setFilter('all')} />
      )}
    </>
  )
}

function Detail({ issue, ctx, back }: { issue: Issue; ctx: AppState; back: () => void }) {
  const waiting = issue.status === 'Needs your OK'
  const watching = issue.status === 'Watching results'
  const researching = ctx.looking.includes(issue.id)
  const goNext = () => {
    if (watching) ctx.go('Experiments')
    else if (waiting) ctx.go('Decisions')
    else if (researching) ctx.toast('We’re already looking into this. Nothing has been changed.')
    else {
      ctx.lookInto(issue.id)
      ctx.toast('Noted. We’ll look at this and come back with a clear next step — nothing changes until then.')
    }
  }
  const cta = watching ? 'See the experiment' : researching ? 'Already looking' : issue.action.title
  return (
    <>
      <button className="back" onClick={back}>← Back to the list</button>
      <section className="detail-heading">
        <span className={`status ${issue.status.toLowerCase().replaceAll(' ', '-')}`} role="status">{issue.status}</span>
        <h1>{issue.title}</h1>
        <p className="subtitle">{issue.campaign} · {issue.channel} · we’re {issue.confidence}% sure</p>
      </section>
      <div className="detail-grid">
        <section className="panel recommendation">
          <p className="eyebrow">What we suggest</p>
          <h2>{issue.action.title}</h2>
          <p>{issue.action.detail}</p>
          <div className="actions">
            <button className="primary" onClick={goNext} aria-label={cta}>{cta}</button>
          </div>
        </section>
        <section className="panel">
          <h2>What we’re seeing</h2>
          <p className="body-copy">{issue.summary} This has been going on for days, not just one odd afternoon.</p>
        </section>
      </div>
      <section className="panel detail-evidence">
        <h2>What the numbers show</h2>
        <p className="muted">From your {issue.channel} account · Sep 1–30</p>
        <div className="evidence">{issue.evidence.map(e => <div key={e.metric}><span className="chart-line"/><b>{e.plain}</b><i>{e.metric}</i></div>)}</div>
        <div className="fake-chart">
          <span>Sep 1</span>
          <svg viewBox="0 0 400 100" preserveAspectRatio="none"><polyline points="0,20 55,28 110,24 165,44 220,51 275,67 330,65 400,88" fill="none" stroke="currentColor" strokeWidth="3"/></svg>
          <span>Today</span>
        </div>
      </section>
    </>
  )
}

function Approvals({ ctx }: { ctx: AppState }) {
  const pending = ctx.issues.find(i => i.status === 'Needs your OK')
  if (ctx.decision === 'approved') {
    return (
      <>
        <section className="page-heading"><div><p className="eyebrow">WAITING ON YOU</p><h1>Your decisions</h1></div></section>
        <div className="success">
          <h2>Done — we’ll take it from here</h2>
          <p>The two new images are going live. We’ll check back when new numbers come in to see whether it worked.</p>
          <div className="success-actions">
            <button className="primary" onClick={() => ctx.go('Experiments')}>See the experiment</button>
            <button className="secondary" onClick={() => ctx.go('Overview')}>Back to overview</button>
          </div>
        </div>
      </>
    )
  }
  if (ctx.decision === 'declined') {
    return (
      <>
        <section className="page-heading"><div><p className="eyebrow">WAITING ON YOU</p><h1>Your decisions</h1></div></section>
        <div className="success declined">
          <h2>Left as it is</h2>
          <p>We didn’t change the Facebook ad. If you change your mind, you can still swap in the new images.</p>
          <div className="success-actions">
            <button className="primary" onClick={() => ctx.setDecision('open')}>Look at it again</button>
            <button className="secondary" onClick={() => ctx.go('To do')}>Back to the list</button>
          </div>
        </div>
      </>
    )
  }
  if (!pending) {
    return (
      <>
        <section className="page-heading"><div><p className="eyebrow">WAITING ON YOU</p><h1>Your decisions</h1><p className="subtitle">Nothing is waiting for a yes.</p></div></section>
        <Empty title="You’re all caught up" text="When something needs your say-so, it will land here — never in the background." action="See what’s on the list" onAction={() => ctx.go('To do')} />
      </>
    )
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">WAITING ON YOU</p>
          <h1>Your decisions</h1>
          <p className="subtitle">Nothing big happens until you say yes.</p>
        </div>
      </section>
      <section className="approval panel">
        <div>
          <Status>Fix first</Status>
          <h2>Swap in fresh images for your Facebook ad</h2>
          <p>People have seen this ad so many times that it has stopped working as well. Saying yes won’t change how much you spend.</p>
          <div className="creative-pair" aria-hidden="true">
            <div><span>Right now</span><PhotoSticker src={img.bag} alt="" rotate={-2} /></div>
            <div><span>Ready to try</span><PhotoSticker src={img.cup} alt="" rotate={3} /></div>
          </div>
          <div className="comparison">
            <div><span>Right now</span><strong>1.08% click</strong><small>About 1 in 93 people who see it</small></div>
            <div><span>What we’re aiming for</span><strong>Back toward 1.72%</strong><small>About 1 in 58 people, with two new versions</small></div>
          </div>
          <div className="actions">
            <button className="secondary" onClick={() => { ctx.setDecision('declined'); ctx.toast('Left as it is. Nothing was sent to Facebook.') }}>No thanks</button>
            <button className="secondary" onClick={() => ctx.go('Settings')}>Change my limits</button>
            <button className="primary" onClick={() => void ctx.approve()}>Yes, do it</button>
          </div>
        </div>
        <aside className="audit">
          <h3>Why you can trust this</h3>
          <p>We’re 92% sure, based on 30 days of your own Facebook and Instagram numbers.</p>
          <p>This doesn’t change your budget or who sees your ads. Your daily limit stays at ${ctx.spendCap}.</p>
          <button className="text-button" onClick={() => ctx.setPanel('audit')}>See the full record →</button>
        </aside>
      </section>
    </>
  )
}

function CampaignsPage({ ctx }: { ctx: AppState }) {
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">YOUR CAMPAIGNS</p>
          <h1>Campaigns</h1>
          <p className="subtitle">How each one is doing against what’s normal for you. Open a row to see the related note.</p>
        </div>
      </section>
      <section className="panel campaign-panel"><CampaignTable onOpen={ctx.openCampaign} /></section>
    </>
  )
}

function Experiments({ ctx }: { ctx: AppState }) {
  if (ctx.decision !== 'approved') {
    return (
      <>
        <section className="page-heading">
          <div>
            <p className="eyebrow">WATCHING RESULTS</p>
            <h1>Experiments</h1>
            <p className="subtitle">This is where we keep an eye on a change after you say yes.</p>
          </div>
        </section>
        <Empty
          title="Nothing is running yet"
          text="Approve a change first. Then this page shows whether it worked, with the numbers before and after."
          action="See what’s waiting on you"
          onAction={() => ctx.go('Decisions')}
        />
      </>
    )
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">WATCHING RESULTS</p>
          <h1>Experiments</h1>
          <p className="subtitle">Two new images are live on Facebook. We’ll compare them with the tired ad as sales come in.</p>
        </div>
      </section>
      <section className="experiment-grid">
        <article className="panel experiment-card">
          <Status>Watching results</Status>
          <h2>Fresh images vs. the tired ad</h2>
          <p>Same audience, same budget. We’re waiting on enough new views before we call a winner.</p>
          <div className="creative-pair">
            <div><span>Current ad</span><PhotoSticker src={img.bag} alt="Coffee bag ad" /><small>Morning Ritual Blend</small></div>
            <div><span>New image</span><PhotoSticker src={img.cup} alt="Coffee cup ad" /><small>The afternoon pour</small></div>
          </div>
          <p className="muted">Usually needs a few days of new numbers. We’ll update you here — we won’t spend more on our own.</p>
          <button className="text-button" onClick={() => ctx.go('Overview')}>Back to overview</button>
        </article>
      </section>
    </>
  )
}

const prompts = [
  'Why did the Facebook ad slow down?',
  'What does earned per $1 mean?',
  'Can it spend more than I allow?',
]

const answers: Record<string, string> = {
  'Why did the Facebook ad slow down?': 'People have seen the same ad about 3.8 times each, and fewer of them click than they used to — 1.08% now, usually 1.72%. We’re 92% sure it is wearing out, not a one-off bad day.',
  'What does earned per $1 mean?': 'For every $1 Brew & Bloom put into ads last month, $3.70 came back as store sales. Marketers call this ROAS. The ad that reminds past visitors is at $5.20; the tired new-customer ad is at $2.10.',
  'Can it spend more than I allow?': 'No. Your daily limit is in Settings. Nothing that costs money happens until you say yes, and we cannot go past the amount you set.',
}

function Ask({ ctx }: { ctx: AppState }) {
  const [turns, setTurns] = useState<ChatTurn[]>([
    { who: 'edge', text: 'Ask about your ads, your store, or a number on the page. I’ll answer from Brew & Bloom’s last 30 days — I won’t invent a figure.' },
  ])
  const [draft, setDraft] = useState('')
  const send = (text: string) => {
    const question = text.trim()
    if (!question) return
    const reply = answers[question] ?? 'I can answer from the demo numbers we already have. Try one of the questions below — they use the same figures as Overview.'
    setTurns(current => [...current, { who: 'you', text: question }, { who: 'edge', text: reply }])
    setDraft('')
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">ASK IN PLAIN ENGLISH</p>
          <h1>Ask a question</h1>
          <p className="subtitle">Answers come from your numbers. If we don’t have the figure, we’ll say so.</p>
        </div>
      </section>
      <section className="panel chat-panel">
        <div className="chat-log">
          {turns.map((turn, i) => (
            <p key={`${turn.who}-${i}`} className={`chat-turn ${turn.who}`}><b>{turn.who === 'you' ? 'You' : 'Journey Edge'}</b>{turn.text}</p>
          ))}
        </div>
        <div className="chat-prompts">
          {prompts.map(prompt => <button key={prompt} className="filter" onClick={() => send(prompt)}>{prompt}</button>)}
        </div>
        <form className="chat-form" onSubmit={(e: FormEvent) => { e.preventDefault(); send(draft) }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask about a campaign, a number, or a limit" aria-label="Your question" />
          <button className="primary" type="submit">Ask</button>
        </form>
        <button className="text-button" onClick={() => ctx.go('Overview')}>Back to overview</button>
      </section>
    </>
  )
}

function SettingsPage({ ctx }: { ctx: AppState }) {
  const [cap, setCap] = useState(String(ctx.spendCap))
  const save = (e: FormEvent) => {
    e.preventDefault()
    const next = Number(cap)
    if (!Number.isFinite(next) || next < 0) {
      ctx.toast('Enter a daily spend limit as a number.')
      return
    }
    void saveSpendCap(next).then(saved => { ctx.setSpendCap(saved.max_daily_spend); ctx.toast(`Saved. We can’t spend more than $${saved.max_daily_spend} a day.`) }).catch(() => ctx.toast('Could not save your limit. Check the connection and try again.'))
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">YOUR RULES</p>
          <h1>Settings</h1>
          <p className="subtitle">These limits still apply, even if we think we’ve found a good idea.</p>
        </div>
      </section>
      <div className="settings-grid">
        <form className="panel" onSubmit={save}>
          <h2>Spending</h2>
          <label className="field">
            <span>Daily spend limit ($)</span>
            <input type="number" min="0" value={cap} onChange={e => setCap(e.target.value)} />
          </label>
          <p className="muted">We cannot spend more than this in a day, and we still ask before any change that costs money.</p>
          <button className="primary" type="submit">Save limits</button>
        </form>
        <section className="panel">
          <h2>Connected accounts</h2>
          <ul className="account-list">
            <li><b>Shopify</b><span>Brew & Bloom · up to date</span></li>
            <li><b>Facebook & Instagram</b><span>Ads manager · up to date</span></li>
            <li><b>Google Ads</b><span>Brand search · up to date</span></li>
            <li><b>Klaviyo</b><span>Welcome flow · up to date</span></li>
          </ul>
          <p className="muted">This demo uses made-up Brew & Bloom numbers. Nothing is sent to your real ad accounts.</p>
        </section>
      </div>
    </>
  )
}

function Empty({ title, text, action, onAction }: { title: string; text: string; action: string; onAction: () => void }) {
  return (
    <div className="empty panel">
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="primary" onClick={onAction}>{action}</button>
    </div>
  )
}

function CampaignDrawer({ campaign, ctx, onClose }: { campaign: Campaign; ctx: AppState; onClose: () => void }) {
  const related = ctx.issues.find(issue => issue.campaign === campaign.name)
  return (
    <div className="drawer-wrap">
      <button className="drawer-scrim" onClick={onClose} aria-label="Close campaign" />
      <aside className="drawer" role="dialog" aria-labelledby="campaign-drawer-title">
        <p className="eyebrow">{campaign.channel}</p>
        <h2 id="campaign-drawer-title">{campaign.name}</h2>
        <p>{campaign.purpose}</p>
        <div className="drawer-stats">
          <div><span>Spent</span><strong>{campaign.spend}</strong></div>
          <div><span>Earned per $1</span><strong>{campaign.earned}</strong></div>
          <div><span>vs last month</span><strong>{campaign.trend}</strong></div>
        </div>
        {related ? (
          <button className="issue-card" onClick={() => { onClose(); ctx.openIssue(related) }}>
            <div className="issue-top"><Status>{related.severity}</Status><span className="muted">{related.status}</span></div>
            <h3>{related.title}</h3>
            <p>{related.summary}</p>
          </button>
        ) : (
          <p className="muted">No open note on this campaign. That’s a good sign — it’s tracking close to normal.</p>
        )}
        <button className="secondary full" onClick={onClose}>Close</button>
      </aside>
    </div>
  )
}

function SidePanel({ panel, ctx, onClose }: { panel: Panel; ctx: AppState; onClose: () => void }) {
  if (panel === 'none') return null
  const title = panel === 'help' ? 'How this demo works' : panel === 'account' ? 'Mel Brooks' : 'Full record'
  return (
    <div className="drawer-wrap">
      <button className="drawer-scrim" onClick={onClose} aria-label="Close panel" />
      <aside className="drawer" role="dialog" aria-labelledby="side-panel-title">
        <p className="eyebrow">{panel === 'account' ? 'SIGNED IN' : panel === 'audit' ? 'THE RECORD' : 'HELP'}</p>
        <h2 id="side-panel-title">{title}</h2>
        {panel === 'help' && (
          <>
            <p>This is a worked example for Brew & Bloom. The numbers stay put so you can follow one story — from “something’s off” to “you decide.”</p>
            <p>If a change would cost money, it stops and asks you first.</p>
            <button className="primary full" onClick={() => { onClose(); ctx.go('To do') }}>Open the to-do list</button>
          </>
        )}
        {panel === 'account' && (
          <>
            <p>You’re signed in as Mel, looking after Brew & Bloom. This is a local demo — nothing is sent to Facebook, Google, or Shopify.</p>
            <button className="secondary full" onClick={() => { onClose(); ctx.go('Settings') }}>Open settings</button>
            <button className="secondary full" onClick={() => ctx.setPanel('help')}>Help</button>
            <button className="primary full" onClick={() => { onClose(); ctx.backToSite() }}>Back to the site</button>
          </>
        )}
        {panel === 'audit' && (
          <>
            <ol className="timeline">
              <li><span className="dot warning"/><div><strong>Waiting for your OK</strong><p>Swap in fresh images. Spend stays the same. We’re 92% sure.</p><small>Today, 12 minutes ago</small></div></li>
              <li><span className="dot"/><div><strong>Worked out the reason</strong><p>Too many people have seen the same ad too often. Clicks fell from 1.72% to 1.08%.</p><small>Today, 18 minutes ago</small></div></li>
              <li><span className="dot"/><div><strong>Read your Facebook numbers</strong><p>Last 30 days of Meta Prospecting. We only looked — nothing was changed.</p><small>Today, 42 minutes ago</small></div></li>
            </ol>
            <button className="secondary full" onClick={onClose}>Close record</button>
          </>
        )}
      </aside>
    </div>
  )
}

// Narrow screens swap the tab row for a full-screen menu rather than squeezing seven sections into a scroll strip.
function MenuOverlay({ page, pending, go, close, openAccount, backToSite }: { page: Page; pending: number; go: (item: Page) => void; close: () => void; openAccount: () => void; backToSite: () => void }) {
  return (
    <div className="menu-overlay" role="dialog" aria-label="Menu">
      <div className="menu-head">
        <button className="journey-brand" onClick={close}><Mark size={26} /> Journey Edge</button>
        <button className="menu-close" onClick={close} aria-label="Close menu">✕</button>
      </div>
      <nav>
        {nav.map(item => (
          <button key={item} className={page === item ? 'selected' : ''} onClick={() => go(item)}>
            {item}
            {item === 'Decisions' && pending > 0 && <span className="count">{pending}</span>}
            <b>›</b>
          </button>
        ))}
      </nav>
      <div className="menu-foot">
        <span className="live" /> Your numbers are up to date · checked 12 minutes ago
        <button className="secondary" onClick={openAccount}>Account</button>
        <button className="text-button" onClick={backToSite}>Back to the site</button>
      </div>
    </div>
  )
}

function Landing({ launch }: { launch: (issue?: Issue) => void }) {
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header-inner">
          <button className="journey-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><Mark size={26} /> Journey Edge</button>
          <div className="header-actions">
            <nav className="pill-nav" aria-label="Site">
              <a href="#product">What it does</a>
              <a href="#workflow">How it works</a>
              <a href="#control">Control</a>
              <a href="#cast">The film</a>
              <button className="sign-in" onClick={() => launch()}>Sign in</button>
              <button className="primary" onClick={() => launch()}>See the demo <b>→</b></button>
            </nav>
            <button type="button" className="landing-burger" aria-label="Open menu" onClick={() => setMenu(true)}>☰</button>
          </div>
        </div>
      </header>
      {menu && (
        <div className="landing-menu" role="dialog" aria-label="Menu">
          <div className="menu-head">
            <button className="journey-brand" onClick={() => setMenu(false)}><Mark size={26} /> Journey Edge</button>
            <button className="menu-close" onClick={() => setMenu(false)} aria-label="Close menu">✕</button>
          </div>
          <nav>
            <a href="#product" onClick={() => setMenu(false)}>What it does</a>
            <a href="#workflow" onClick={() => setMenu(false)}>How it works</a>
            <a href="#control" onClick={() => setMenu(false)}>Staying in control</a>
            <a href="#cast" onClick={() => setMenu(false)}>The film</a>
          </nav>
            <button className="secondary full" onClick={() => { setMenu(false); launch() }}>Sign in</button>
          <button className="primary full" onClick={() => { setMenu(false); launch() }}>See the demo</button>
        </div>
      )}
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="landing-eyebrow">FOR PEOPLE WHO RUN A SHOPIFY STORE</p>
            <h1>Know what to fix.<br/><em>Understand why.</em><br/>Stay in control.</h1>
            <p>Journey Edge watches your ads and your sales, tells you in plain English what’s going wrong and why, and always asks before it changes anything. No jargon, no guesswork.</p>
            <div className="hero-actions">
              <button className="primary large" onClick={() => launch()}>See the demo <b>→</b></button>
              <a href="#workflow" className="watch-link">See how it works <span>↓</span></a>
            </div>
            <div className="source-row">
              <span><i>✓</i> Real sales from Shopify</span>
              <span><i>✓</i> Nothing changes without your yes</span>
            </div>
          </div>
          <HeroStage launch={launch} />
        </section>
        <LogoCloud />
        <section className="proof" id="product">
          <p className="landing-eyebrow">WHAT IT DOES FOR YOU</p>
          <h2>You shouldn’t need a marketing degree<br/>to know <em>what to do next.</em></h2>
          <div className="concept-grid">
            <ConceptCard tone="spot" word="Spot" kicker="Catches it early" text="Tells you which ads are slipping — and which are quietly doing well — before it costs you money."><SpotArt /></ConceptCard>
            <ConceptCard tone="explain" word="Explain" kicker="Plain words, real figures" text="Says why in everyday words, and shows you the numbers it read to get there."><ExplainArt /></ConceptCard>
            <ConceptCard tone="approve" word="Approve" kicker="Your yes, every time" text="Nothing that costs you money happens until you’ve seen it and agreed."><ApproveArt /></ConceptCard>
          </div>
        </section>
        <section className="workflow" id="workflow">
          <div className="workflow-heading">
            <p className="landing-eyebrow">A CALMER WAY TO WORK</p>
            <h2>From scattered numbers<br/>to <em>one clear next step.</em></h2>
            <p>You get a short list of things worth doing — not another dashboard to puzzle over.</p>
          </div>
          <div className="stage-stack">
            <div className="stage-copy">
              <h3>It reads the numbers first</h3>
              <p>Reads Shopify, Facebook, Google and email, then lines up what’s actually off — in the order that matters.</p>
            </div>
            <Scene src={img.working}>
              <GlassCard>
                <p className="glass-kicker">Journey Edge working…</p>
                <ul>
                  <li><i /> People are tired of your best ad <b>Reviewing</b></li>
                  <li><i /> One ad has room to grow <b>Up next</b></li>
                  <li><i /> Welcome email clicks dropped <b>Waiting</b></li>
                </ul>
              </GlassCard>
              <PhotoSticker className="scene-sticker bag" src={img.bag} alt="" rotate={-8} />
              <MetaAdSticker rotate={6} />
            </Scene>
            <div className="stage-arrow" aria-hidden="true">↓</div>
            <div className="stage-copy stage-copy-end">
              <h3>Keeps you in the loop</h3>
              <p>It finishes the reading, then asks you before the next step would spend money.</p>
            </div>
            <Scene src={img.loop} className="scene-end">
              <GlassCard>
                <p className="glass-kicker">Waiting for your OK</p>
                <p className="glass-title">Swap in two fresh images</p>
                <p>Same budget. Same audience. We’ll check whether clicks recover.</p>
                <div className="glass-bar"><span /></div>
              </GlassCard>
              <ShopifyOrderSticker rotate={-6} />
              <PhotoSticker className="scene-sticker cup" src={img.cup} alt="" rotate={7} />
            </Scene>
          </div>
        </section>
        <section className="control" id="control">
          <div>
            <p className="landing-eyebrow">HELPFUL, NEVER RECKLESS</p>
            <h2>Clever software.<br/><em>Your rules.</em></h2>
            <p>Three promises that don’t bend, even when we think we’ve found a good idea.</p>
          </div>
          <div className="control-list">
            <Control title="We never make numbers up" text="Every sentence we write points back to a real figure, a real date, and the account it came from." />
            <Control title="Nothing big happens behind your back" text="You set how much can be spent and what needs your say-so. We can’t go past either." />
            <Control title="A full record of every decision" text="What we suggested, why we suggested it, what you decided, and how it turned out." />
          </div>
        </section>
        <section className="story" id="story">
          <div className="story-label">
            <p className="landing-eyebrow">A WORKED EXAMPLE</p>
            <h2>Meet Brew<br/>& Bloom.</h2>
            <p>A coffee brand whose best ad had quietly started to wear out.</p>
            <span>Made-up data, for the demo</span>
            <div className="story-stickers">
              <PhotoSticker src={img.bag} alt="Brew & Bloom coffee bag" rotate={-6} />
              <PhotoSticker src={img.mailer} alt="Shipping mailer" rotate={8} />
            </div>
          </div>
          <div className="story-flow">
            <StoryCard step="What we noticed" title="Their best ad had gone stale" body="37% fewer people clicked it, while the same shoppers kept being shown it again and again." image={img.bag} />
            <div className="flow-arrow">↓</div>
            <StoryCard step="What we suggested" title="New images, same budget" body="Two fresh versions ready to go. Not a penny more in spend." image={img.cup} />
            <div className="flow-arrow">↓</div>
            <StoryCard step="Who decided" title="They did" body="They read the reason, checked the numbers behind it, and clicked yes." />
          </div>
        </section>
        <section className="cast" id="cast">
          <div className="cast-head">
            <p className="landing-eyebrow">THE PEOPLE IN THE FILM</p>
            <h2>Behind every number,<br/><em>someone scrolling.</em></h2>
            <p>Our launch film follows three shoppers who all meet the same Brew &amp; Bloom ad. What we call an ad wearing out, they just call “seen it.”</p>
          </div>
          <div className="cast-grid">
            {cast.map(member => <CastCard key={member.id} member={member} />)}
          </div>
        </section>
        <section className="familiar" id="familiar">
          <div>
            <p className="landing-eyebrow">THINGS YOU ALREADY LOOK AT</p>
            <h2>It reads the tools<br/>you already open.</h2>
            <p>Not another mystery dashboard. The same ads, orders, and emails you already check — lined up, and explained.</p>
          </div>
          <div className="familiar-board">
            <MetaAdSticker rotate={-5} />
            <ShopifyOrderSticker rotate={4} />
            <EmailSticker rotate={-3} />
            <GoogleAdSticker rotate={5} />
            <PhotoSticker src={img.cup} alt="" rotate={-7} />
          </div>
        </section>
        <section className="closing">
          <DotField area="closing" />
          <p className="landing-eyebrow">SPEND LESS TIME WONDERING</p>
          <h2>Stop digging through dashboards<br/>for an answer.</h2>
          <p>Get a short, clear list of what’s worth doing — and why.</p>
          <button className="primary large" onClick={() => launch()}>Try Journey Edge <b>→</b></button>
        </section>
      </main>
      <footer>
        <DotField area="footer" />
        <div className="journey-brand"><Mark size={24} /> Journey Edge</div>
        <p>Marketing decisions in plain English.</p>
        <div>
          <a href="#product">What it does</a>
          <a href="#workflow">How it works</a>
          <a href="#control">Staying in control</a>
        </div>
      </footer>
    </div>
  )
}

function Control({ title, text }: { title: string; text: string }) {
  return <article><span>✓</span><div><h3>{title}</h3><p>{text}</p></div></article>
}

function StoryCard({ step, title, body, image }: { step: string; title: string; body: string; image?: string }) {
  return (
    <article aria-label={step}>
      {image ? (
        <figure className="story-media">
          <img src={image} alt="" />
        </figure>
      ) : (
        <span>{step}</span>
      )}
      <div className="story-copy">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </article>
  )
}

function HeroStage({ launch }: { launch: (issue?: Issue) => void }) {
  return (
    <div className="hero-stage">
      <img className="hero-atmosphere" src={img.hero} alt="" />
      <DotField area="hero" />
      <div className="preview">
        <div className="preview-bar"><b><Mark size={13} />Journey Edge</b><span>Brew & Bloom</span><i>MB</i></div>
        <div className="preview-body">
          <div className="preview-side">
            <span className="active">Overview</span>
            <span>To do <b>1</b></span>
            <span>Decisions</span>
            <span>Campaigns</span>
          </div>
          <div className="preview-content">
            <p>GOOD AFTERNOON, MEL</p>
            <h3>Here’s what needs your attention.</h3>
            <div className="mini-metrics">
              <div><span>Store sales</span><b>$40,280</b><small>↑ 8.4%</small></div>
              <div><span>Earned per $1 of ads</span><b>$3.70</b><small>↑ 20¢</small></div>
            </div>
            <button className="preview-issue" onClick={() => launch(seedIssues[0])}>
              <div>
                <label>FIX FIRST</label>
                <strong>People are getting tired of your best ad</strong>
                <span>Seen too often · fewer clicks · 92% sure</span>
              </div>
              <b>→</b>
            </button>
          </div>
        </div>
      </div>
      <PhotoSticker className="hero-sticker bag" src={img.bag} alt="" rotate={-11} />
      <PhotoSticker className="hero-sticker cup" src={img.cup} alt="" rotate={8} />
      <div className="floating-note"><span>✓</span><div><b>Tied to a number</b><small>Every answer points to a real figure.</small></div></div>
    </div>
  )
}

export default function App() {
  const [landing, setLanding] = useState(() => new URLSearchParams(window.location.search).get('view') !== 'app')
  const [page, setPage] = useState<Page>('Overview')
  const [detail, setDetail] = useState<Issue | null>(null)
  const [notice, setNotice] = useState('')
  const [decision, setDecision] = useState<Decision>('open')
  const [looking, setLooking] = useState<string[]>([])
  const [spendCap, setSpendCap] = useState(500)
  const [panel, setPanel] = useState<Panel>('none')
  const [campaignName, setCampaignName] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [serverIssues, setServerIssues] = useState<Issue[] | null>(null)
  const approve = async () => {
    try { const result = await approveAction('creative-fatigue'); setDecision('approved'); setNotice(result.message) }
    catch { setNotice('Could not record your decision. Nothing was changed.') }
  }

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(''), 4200)
    return () => window.clearTimeout(id)
  }, [notice])

  useEffect(() => {
    getIssues().then(setServerIssues).catch(() => setNotice('Couldn’t reach the server. Using the demo numbers already on this page.'))
  }, [])

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

  useEffect(() => {
    if (panel === 'none' && !campaignName) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPanel('none'); setCampaignName(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, campaignName])

  const liveIssues = useMemo(() => (serverIssues ?? seedIssues).map(issue => {
    if (issue.id === 'creative-fatigue' && decision === 'approved') {
      return { ...issue, status: 'Watching results' as const, severity: 'Good news' as const }
    }
    if (looking.includes(issue.id) && issue.status === 'New') {
      return { ...issue, status: 'Explained' as const }
    }
    return issue
  }), [decision, looking, serverIssues])

  const ctx: AppState = {
    go: next => { setPage(next); setDetail(null); setCampaignName(null); setPanel('none') },
    openIssue: issue => { setDetail(issue); setPage('To do'); setCampaignName(null) },
    openCampaign: name => setCampaignName(name),
    backToSite: () => { setLanding(true); setPage('Overview'); setDetail(null); setPanel('none'); window.history.replaceState({}, '', window.location.pathname) },
    toast: setNotice,
    setPanel,
    issues: liveIssues,
    decision,
    setDecision,
    approve,
    looking,
    lookInto: id => setLooking(current => current.includes(id) ? current : [...current, id]),
    spendCap,
    setSpendCap,
  }

  const campaign = campaigns.find(row => row.name === campaignName) ?? null
  const pendingCount = liveIssues.filter(i => i.status === 'Needs your OK').length

  if (landing) return <Landing launch={issue => { setLanding(false); window.history.replaceState({}, '', '?view=app'); if (issue) { setDetail(issue); setPage('To do') } }} />

  const body: ReactNode = detail
    ? <Detail issue={detail} ctx={ctx} back={() => setDetail(null)} />
    : page === 'Overview' ? <Overview ctx={ctx} select={ctx.openIssue} />
    : page === 'To do' ? <Issues ctx={ctx} select={ctx.openIssue} />
    : page === 'Decisions' ? <Approvals ctx={ctx} />
    : page === 'Campaigns' ? <CampaignsPage ctx={ctx} />
    : page === 'Experiments' ? <Experiments ctx={ctx} />
    : page === 'Ask a question' ? <Ask ctx={ctx} />
    : <SettingsPage ctx={ctx} />

  return (
    <div className="app">
      <header className="appbar">
        <button className="journey-brand" onClick={() => ctx.go('Overview')}><Mark size={26} /> Journey Edge</button>
        <span className="workspace">Brew &amp; Bloom</span>
        <div className="appbar-right">
          <SyncChip />
          <button
            className="account"
            title="Mel Brooks"
            aria-label="Account menu for Mel Brooks"
            aria-haspopup="dialog"
            aria-expanded={panel === 'account'}
            onClick={() => setPanel(panel === 'account' ? 'none' : 'account')}
          >
            <span aria-hidden="true">MB</span>
          </button>
          <button className="burger" onClick={() => setMenu(true)} aria-label="Open menu">☰</button>
        </div>
      </header>
      <nav className="tabs" aria-label="Sections">
        {nav.map(item => (
          <button key={item} onClick={() => ctx.go(item)} className={page === item && !detail ? 'selected' : ''}>
            {item}
            {item === 'Decisions' && pendingCount > 0 && <span className="count">{pendingCount}</span>}
          </button>
        ))}
      </nav>
      <div className="content">
        {notice && <div className="toast" role="status">{notice}</div>}
        {body}
      </div>
      {menu && <MenuOverlay page={page} pending={pendingCount} go={item => { ctx.go(item); setMenu(false) }} close={() => setMenu(false)} openAccount={() => { setMenu(false); setPanel('account') }} backToSite={() => { setMenu(false); ctx.backToSite() }} />}
      {campaign && <CampaignDrawer campaign={campaign} ctx={ctx} onClose={() => setCampaignName(null)} />}
      <SidePanel panel={panel} ctx={ctx} onClose={() => setPanel('none')} />
    </div>
  )
}
