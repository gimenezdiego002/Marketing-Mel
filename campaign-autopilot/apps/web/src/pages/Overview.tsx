import { useNavigate } from 'react-router-dom'
import { ActionProposal, CampaignTable, IssueCard, Metric, SpendRevenueChart, Timeline } from '../components'
import { useDashboard } from '../dashboard-context'
import { money } from '../labels'

export default function Overview() {
  const ctx = useDashboard()
  const navigate = useNavigate()
  const { demo, graph, trends, action } = ctx
  const waiting = demo.phase === 'awaiting_approval' ? 1 : 0
  const ready = demo.phase === 'ready' || demo.phase === 'complete'
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">BREW & BLOOM · LAST 30 DAYS</p>
          <h1>Good afternoon, Mel.</h1>
          <p className="subtitle">{ctx.mode === 'demo'
            ? 'A worked example with made-up Brew & Bloom numbers. Nothing here is a live ad account.'
            : ready ? 'Run the agent to read your campaigns against their own baselines.' : 'Here’s what the live loop is doing with your numbers.'}</p>
        </div>
        <div className="heading-actions">
          <p className="period-chip">{trends?.window ?? 'Last 30 days'}</p>
          <button className="primary" disabled={ctx.busy} onClick={() => void ctx.run()}>{ctx.busy ? 'Working…' : 'Run agent'}</button>
        </div>
      </section>
      {graph && (
        <ol className="loop-nodes" aria-label="Agent loop">
          {graph.nodes.map(node => <li key={node.name} className={node.status}>{node.name}</li>)}
        </ol>
      )}
      <section className="metrics">
        <Metric name="Money your store made" value={money(demo.overview.shopify_revenue)} detail="Shopify orders in the seed window" />
        <Metric name="Money you spent on ads" value={money(demo.overview.ad_spend)} detail="Sum of campaign spend" tone="flat" />
        <Metric name="Earned per $1 of ads" value={money(demo.overview.blended_roas, 2)} detail="Attributed revenue ÷ ad spend" means="For every $1 you put into ads, this is how much came back as sales. Marketers call this ROAS." />
        <Metric name="On your list" value={String(demo.issues.length)} detail={waiting ? '1 waiting on you' : demo.phase === 'recommended' ? 'Held as a recommendation' : demo.phase === 'blocked' ? 'Blocked by your limits' : ready ? 'Run the agent to fill this' : 'Nothing waiting on you'} tone={waiting || demo.phase === 'blocked' ? 'alert' : undefined} />
      </section>
      {action && (action.status === 'proposed' || action.status === 'recommended' || demo.phase === 'blocked') && (
        <ActionProposal action={action} busy={ctx.busy} onDecide={decision => void ctx.approve(decision)} onView={() => void navigate(ctx.to('/decisions'))} />
      )}
      <section className="split">
        <div className="panel">
          <div className="panel-title">
            <div><h2>Needs your attention</h2><p>{ctx.mode === 'demo' ? 'From the walkthrough seed' : 'From the live loop, not a script'}</p></div>
            <button className="text-button" onClick={() => void navigate(ctx.to('/todo'))}>See everything</button>
          </div>
          {demo.issues.length ? (
            <div className="issue-list">{demo.issues.slice(0, 3).map(issue => (
              <IssueCard key={issue.id} issue={issue} phase={demo.phase} action={action} approving={ctx.busy} onApprove={() => ctx.approve('approved')} onClick={() => void navigate(ctx.to(`/todo/${issue.id}`))} />
            ))}</div>
          ) : (
            <p className="muted">No issue yet. Click Run agent to compare each campaign with its baseline.</p>
          )}
        </div>
        <div className="panel activity">
          <div className="panel-title"><div><h2>What we’ve been doing</h2><p>Every step, with the numbers behind it</p></div></div>
          <Timeline events={demo.events} />
        </div>
      </section>
      <section className="panel campaign-panel">
        <div className="panel-title">
          <div><h2>How your campaigns are doing</h2><p>Compared with what’s normal for you</p></div>
          <button className="text-button" onClick={() => void navigate(ctx.to('/campaigns'))}>See all campaigns</button>
        </div>
        <CampaignTable campaigns={demo.campaigns} onOpen={ctx.openCampaign} />
      </section>
      {trends && (
        <section className="panel campaign-panel">
          <div className="panel-title"><div><h2>Spend against attributed revenue</h2><p>{trends.window}</p></div></div>
          <SpendRevenueChart days={trends.days} />
        </section>
      )}
    </>
  )
}
