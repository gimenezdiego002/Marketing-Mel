import { useEffect, useState, type FormEvent } from 'react'
import { useDashboard } from '../dashboard-context'
import type { Guardrails } from '../types'

export default function Settings() {
  const ctx = useDashboard()
  const current = ctx.demo.guardrails
  const [cap, setCap] = useState(String(current.max_daily_spend))
  const [confidence, setConfidence] = useState(String(current.min_confidence))
  const [autonomy, setAutonomy] = useState(current.autonomy_level)
  useEffect(() => {
    setCap(String(current.max_daily_spend))
    setConfidence(String(current.min_confidence))
    setAutonomy(current.autonomy_level)
  }, [current.max_daily_spend, current.min_confidence, current.autonomy_level])
  const save = (e: FormEvent) => {
    e.preventDefault()
    const maxDailySpend = Number(cap)
    const minConfidence = Number(confidence)
    if (!Number.isFinite(maxDailySpend) || maxDailySpend < 0) {
      ctx.toast('Enter a daily spend limit as a number.')
      return
    }
    if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1) {
      ctx.toast('Minimum confidence must be between 0 and 1.')
      return
    }
    void ctx.saveRules({ ...current, max_daily_spend: maxDailySpend, min_confidence: minConfidence, autonomy_level: autonomy })
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">YOUR RULES</p>
          <h1>Settings</h1>
          <p className="subtitle">Save these before you run the agent. They apply to the next run, not to a loop that is already paused.</p>
        </div>
      </section>
      <div className="settings-grid">
        <form className="panel" onSubmit={save}>
          <h2>Spending and autonomy</h2>
          <label className="field">
            <span>Daily spend limit ($)</span>
            <input type="number" min="0" value={cap} onChange={e => setCap(e.target.value)} />
          </label>
          <label className="field">
            <span>Minimum confidence (0–1)</span>
            <input type="number" min="0" max="1" step="0.01" value={confidence} onChange={e => setConfidence(e.target.value)} />
          </label>
          <label className="field">
            <span>Autonomy</span>
            <select value={autonomy} onChange={e => setAutonomy(e.target.value as Guardrails['autonomy_level'])}>
              <option value="recommend">Recommend only — never write</option>
              <option value="assisted">Ask me first on high-risk writes</option>
              <option value="auto">Auto when the action is low risk</option>
            </select>
          </label>
          <p className="muted">Launching new creative is always high risk, so Auto still pauses for your OK. Current daily budgets total $650; a cap below that blocks the write.</p>
          <div className="actions">
            <button className="primary" type="submit" disabled={ctx.busy}>Save limits</button>
            <button className="secondary" type="button" disabled={ctx.busy} onClick={() => void ctx.reset()}>Reset demo</button>
          </div>
        </form>
        <section className="panel">
          <h2>Connected accounts</h2>
          <ul className="account-list">
            <li><b>Shopify</b><span>Brew & Bloom · seed orders</span></li>
            <li><b>Facebook & Instagram</b><span>Simulated writes</span></li>
            <li><b>Google Ads</b><span>Simulated writes</span></li>
            <li><b>Klaviyo</b><span>Seed snapshots</span></li>
          </ul>
          <p className="muted">This demo uses made-up Brew & Bloom numbers. Nothing is sent to your real ad accounts. Reset restores the default $750 cap, 0.70 confidence floor, and assisted autonomy.</p>
        </section>
      </div>
    </>
  )
}
