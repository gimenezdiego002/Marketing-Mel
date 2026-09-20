import { useNavigate } from 'react-router-dom'
import { BeforeAfterCard, Empty, Status } from '../components'
import { useDashboard } from '../dashboard-context'
import { money } from '../labels'

export default function Experiments() {
  const ctx = useDashboard()
  const navigate = useNavigate()
  const action = ctx.action
  const experiment = ctx.demo.experiments[0]
  if (experiment) {
    return (
      <>
        <section className="page-heading">
          <div>
            <p className="eyebrow">WATCHING RESULTS</p>
            <h1>Experiments</h1>
            <p className="subtitle">Before and after come from the measured recovery week, not from invented copy.</p>
          </div>
        </section>
        <BeforeAfterCard experiment={experiment} />
      </>
    )
  }
  if (action?.status === 'applied') {
    return (
      <>
        <section className="page-heading">
          <div>
            <p className="eyebrow">WATCHING RESULTS</p>
            <h1>Experiments</h1>
            <p className="subtitle">A real campaign would now wait seven days. For the demo, inject the next week of seed data.</p>
          </div>
        </section>
        <section className="experiment-grid">
          <article className="panel experiment-card">
            <div className="stack-head">
              <Status>Watching results</Status>
              <h2>{action.creative?.headline || 'Guarded write is live'}</h2>
            </div>
            <p>{action.rationale}</p>
            <p className="muted">Spend change {money(action.spend_change, 0)}. Nothing extra was added to the daily budget.</p>
            <button className="primary" disabled={ctx.busy} onClick={() => void ctx.simulate()}>{ctx.busy ? 'Measuring…' : 'Simulate next week'}</button>
          </article>
        </section>
      </>
    )
  }
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
        onAction={() => void navigate(ctx.to('/decisions'))}
      />
    </>
  )
}
