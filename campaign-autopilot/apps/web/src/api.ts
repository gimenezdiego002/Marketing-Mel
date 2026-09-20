import type { ChatAnswer, DemoState, GraphView, Guardrails, Issue, Organic, Trends } from './types'

const agentUrl = import.meta.env.VITE_AGENT_URL ?? 'http://127.0.0.1:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${agentUrl}${path}`, {
    ...init,
    headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const getState = () => request<DemoState>('/api/state')
export const getIssues = async (): Promise<Issue[]> => (await getState()).issues
export const getTrends = () => request<Trends>('/api/trends')
export const getOrganic = () => request<Organic>('/api/organic')
export const getGraph = () => request<GraphView>('/api/graph')
export const saveGuardrails = (guardrails: Guardrails) =>
  request<Guardrails>('/api/guardrails', { method: 'PUT', body: JSON.stringify(guardrails) })
export const runAgent = () => request<DemoState>('/api/agent/run', { method: 'POST' })
export const decideAction = (actionId: string, decision: 'approved' | 'rejected') =>
  request<DemoState>(`/api/approvals/${actionId}`, { method: 'POST', body: JSON.stringify({ decision }) })
export const simulateWeek = () => request<DemoState>('/api/simulate-week', { method: 'POST' })
export const resetDemo = () => request<DemoState>('/api/reset', { method: 'POST' })
export const askQuestion = (message: string) =>
  request<ChatAnswer>('/api/chat', { method: 'POST', body: JSON.stringify({ message }) })
