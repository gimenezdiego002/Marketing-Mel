import type { Issue } from './data'

const agentUrl = import.meta.env.VITE_AGENT_URL ?? 'http://127.0.0.1:8000'

export async function getIssues(): Promise<Issue[]> {
  const response = await fetch(`${agentUrl}/api/issues`)
  if (!response.ok) throw new Error('Journey Edge agent is unavailable')
  return response.json() as Promise<Issue[]>
}

export async function approveAction(issueId: string) {
  const response = await fetch(`${agentUrl}/api/actions/${issueId}/approve`, { method: 'POST' })
  if (!response.ok) throw new Error('The approval could not be recorded')
  return response.json() as Promise<{ message: string }>
}
