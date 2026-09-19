import { issues as seedIssues, type Issue } from './data'

const agentUrl = import.meta.env.VITE_AGENT_URL ?? 'http://127.0.0.1:8000'

export async function getIssues(): Promise<Issue[]> {
  const response = await fetch(`${agentUrl}/api/issues`)
  if (!response.ok) throw new Error('Journey Edge agent is unavailable')
  const rows = await response.json() as Array<Omit<Partial<Issue>, 'status' | 'severity'> & { id: string; status?: string; severity?: string }>
  return rows.map(row => {
    const fallback = seedIssues.find(issue => issue.id === row.id)
    if (!fallback) throw new Error(`Unknown issue returned by the agent: ${row.id}`)
    const status = row.status === 'Awaiting approval' ? 'Needs your OK' : row.status === 'Diagnosed' ? 'Explained' : row.status === 'Applied' ? 'Watching results' : fallback.status
    const severity = row.severity === 'High' ? 'Fix first' : row.severity === 'Medium' ? 'Worth a look' : row.severity === 'Low' ? 'Good news' : fallback.severity
    return { ...fallback, ...row, status, severity, evidence: fallback.evidence, action: fallback.action } as Issue
  })
}

export async function approveAction(issueId: string) {
  const response = await fetch(`${agentUrl}/api/actions/${issueId}/approve`, { method: 'POST' })
  if (!response.ok) throw new Error('The approval could not be recorded')
  return response.json() as Promise<{ message: string }>
}

export async function saveSpendCap(maxDailySpend: number) {
  const response = await fetch(`${agentUrl}/api/settings/guardrails`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max_daily_spend: maxDailySpend }),
  })
  if (!response.ok) throw new Error('The spending limit could not be saved')
  return response.json() as Promise<{ max_daily_spend: number }>
}
