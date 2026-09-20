import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Empty, IssueCard } from '../components'
import { useDashboard } from '../dashboard-context'
import { displayChannel, displaySeverity, displayStatus } from '../labels'

type Filter = 'all' | 'waiting' | 'fix' | 'meta' | 'email'

export default function Todo() {
  const ctx = useDashboard()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const shown = ctx.demo.issues.filter(issue => {
    const status = displayStatus(issue, ctx.demo.phase, ctx.action)
    if (filter === 'waiting') return status === 'Needs your OK'
    if (filter === 'fix') return displaySeverity(issue.severity) === 'Fix first'
    if (filter === 'meta') return displayChannel(issue.channel).includes('Facebook')
    if (filter === 'email') return displayChannel(issue.channel) === 'Email'
    return true
  })
  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: `Everything · ${ctx.demo.issues.length}` },
    { id: 'waiting', label: `Waiting on you · ${ctx.demo.phase === 'awaiting_approval' ? 1 : 0}` },
    { id: 'fix', label: `Fix first · ${ctx.demo.issues.filter(i => displaySeverity(i.severity) === 'Fix first').length}` },
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
        <div className="issues-grid">{shown.map(issue => (
          <IssueCard key={issue.id} issue={issue} phase={ctx.demo.phase} action={ctx.action} approving={ctx.busy} onApprove={() => ctx.approve('approved')} onClick={() => void navigate(ctx.to(`/todo/${issue.id}`))} />
        ))}</div>
      ) : (
        <Empty title="Nothing in this view" text={ctx.demo.issues.length ? 'Try another filter, or go back to everything.' : 'Run the agent on Overview to detect a change.'} action={ctx.demo.issues.length ? 'Show everything' : 'Run agent'} onAction={() => { if (ctx.demo.issues.length) setFilter('all'); else void ctx.run() }} />
      )}
    </>
  )
}
