import { createContext, useContext } from 'react'
import type { AppMode } from './nav'
import type { Action, ChatAnswer, DemoState, GraphView, Guardrails, Organic, Trends } from './types'

export type Panel = 'none' | 'help' | 'account' | 'audit'

export type DashboardContextValue = {
  mode: AppMode
  to: (rest: string) => string
  demo: DemoState
  graph: GraphView | null
  trends: Trends | null
  organic: Organic | null
  action?: Action
  busy: boolean
  toast: (msg: string) => void
  run: () => Promise<void>
  approve: (decision: 'approved' | 'rejected') => Promise<void>
  simulate: () => Promise<void>
  reset: () => Promise<void>
  saveRules: (guardrails: Guardrails) => Promise<void>
  ask: (message: string) => Promise<ChatAnswer>
  setPanel: (panel: Panel) => void
  openCampaign: (id: string) => void
}

export const DashboardContext = createContext<DashboardContextValue | null>(null)

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used inside Dashboard')
  return ctx
}
