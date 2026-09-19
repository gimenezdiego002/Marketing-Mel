import type { ChatAnswer, DemoState, Guardrails } from './types'

const agentUrl = import.meta.env.VITE_AGENT_URL ?? 'http://127.0.0.1:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${agentUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Agent service is unavailable' }))
    throw new Error(payload.detail ?? 'Agent service is unavailable')
  }
  return response.json() as Promise<T>
}

export const api = {
  state: () => request<DemoState>('/api/state'),
  run: () => request<DemoState>('/api/agent/run', { method: 'POST' }),
  decide: (id: string, decision: 'approved' | 'rejected') => request<DemoState>(`/api/approvals/${id}`, { method: 'POST', body: JSON.stringify({ decision }) }),
  simulate: () => request<DemoState>('/api/simulate-week', { method: 'POST' }),
  reset: () => request<DemoState>('/api/reset', { method: 'POST' }),
  chat: (message: string) => request<ChatAnswer>('/api/chat', { method: 'POST', body: JSON.stringify({ message }) }),
  saveGuardrails: (guardrails: Guardrails) => request<Guardrails>('/api/guardrails', { method: 'PUT', body: JSON.stringify(guardrails) }),
}
