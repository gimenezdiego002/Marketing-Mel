import { useNavigate, useParams } from 'react-router-dom'
import { ActionProposal, DiagnosisPanel } from '../components'
import { useDashboard } from '../dashboard-context'
import { displayChannel } from '../labels'

export default function IssueDetail() {
  const { issueId } = useParams()
  const ctx = useDashboard()
  const navigate = useNavigate()
  const issue = ctx.demo.issues.find(item => item.id === issueId)
  if (!issue) {
    return (
      <>
        <button className="back" onClick={() => void navigate(ctx.to('/todo'))}>← Back to the list</button>
        <section className="page-heading"><div><h1>That note isn’t on the list</h1><p className="subtitle">It may have cleared after the last agent run.</p></div></section>
      </>
    )
  }
  const related = ctx.action?.issue_id === issue.id ? ctx.action : undefined
  return (
    <>
      <button className="back" onClick={() => void navigate(ctx.to('/todo'))}>← Back to the list</button>
      <section className="detail-heading">
        <h1>{issue.title}</h1>
        <p className="subtitle">{issue.campaign} · {displayChannel(issue.channel)} · we’re {issue.confidence}% sure</p>
      </section>
      <DiagnosisPanel issue={issue} />
      {related ? (
        <ActionProposal action={related} busy={ctx.busy} onDecide={decision => void ctx.approve(decision)} />
      ) : (
        <section className="panel recommendation">
          <div className="stack-head">
            <p className="eyebrow">What we noticed</p>
            <h2>{issue.impact}</h2>
          </div>
          <p>{issue.summary}</p>
        </section>
      )}
    </>
  )
}
