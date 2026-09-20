import { ChatPanel } from '../components'
import { useDashboard } from '../dashboard-context'

export default function Ask() {
  const ctx = useDashboard()
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">ASK IN PLAIN ENGLISH</p>
          <h1>Ask a question</h1>
          <p className="subtitle">{ctx.mode === 'demo'
            ? 'Answers use the Brew & Bloom walkthrough seed. If we don’t have the figure, we’ll say so.'
            : 'Answers come from the live loop, guardrails, and seed metrics. If we don’t have the figure, we’ll say so.'}</p>
        </div>
      </section>
      <ChatPanel ask={ctx.ask} />
    </>
  )
}
