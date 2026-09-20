import { useNavigate } from 'react-router-dom'
import { ActionProposal, Empty, SafetyCard, Status } from '../components'
import { useDashboard } from '../dashboard-context'

export default function Decisions() {
  const ctx = useDashboard()
  const navigate = useNavigate()
  const action = ctx.action
  const issue = ctx.demo.issues[0]
  if (ctx.demo.phase === 'applied' || ctx.demo.phase === 'measured') {
    return (
      <>
        <section className="page-heading"><div><p className="eyebrow">DONE FOR NOW</p><h1>Your decisions</h1></div></section>
        <div className="success">
          <h2>Done — we’ll take it from here</h2>
          <p>The guarded write ran through the simulated connector. Spend did not change. Measure the next week when you are ready.</p>
          <div className="success-actions">
            <button className="primary" onClick={() => void navigate(ctx.to('/experiments'))}>See the experiment</button>
            <button className="secondary" onClick={() => void navigate(ctx.to('/overview'))}>Back to overview</button>
          </div>
        </div>
      </>
    )
  }
  if (ctx.demo.phase === 'rejected') {
    return (
      <>
        <section className="page-heading"><div><p className="eyebrow">LEFT AS IT IS</p><h1>Your decisions</h1></div></section>
        <div className="success declined">
          <h2>Left as it is</h2>
          <p>No connector write ran. The loop recorded the rejection and stopped.</p>
          <div className="success-actions">
            <button className="primary" onClick={() => void ctx.run()}>Run agent again</button>
            <button className="secondary" onClick={() => void navigate(ctx.to('/todo'))}>Back to the list</button>
          </div>
        </div>
      </>
    )
  }
  if (!action || !issue) {
    return (
      <>
        <section className="page-heading"><div><p className="eyebrow">WAITING ON YOU</p><h1>Your decisions</h1><p className="subtitle">Nothing is waiting for a yes.</p></div></section>
        <Empty title="You’re all caught up" text="Run the agent first. If a write is high risk, it will pause here." action="Run agent" onAction={() => void ctx.run()} />
      </>
    )
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">WAITING ON YOU</p>
          <h1>Your decisions</h1>
          <p className="subtitle">Nothing big happens until the loop and your rules agree.</p>
        </div>
      </section>
      {ctx.demo.phase === 'blocked' ? (
        <section className="panel">
          <div className="stack-head">
            <Status>Blocked</Status>
            <h2>Your spend cap stopped this write</h2>
          </div>
          <p>{action.guardrail_reason}</p>
          <p className="muted">Raise the daily limit in Settings, then run the agent again. Auto mode still cannot skip a high-risk creative launch.</p>
          <div className="actions">
            <button className="primary" onClick={() => void navigate(ctx.to('/settings'))}>Change my limits</button>
          </div>
        </section>
      ) : (
        <>
          <ActionProposal action={action} busy={ctx.busy} onDecide={decision => void ctx.approve(decision)} />
          <SafetyCard />
        </>
      )}
    </>
  )
}
