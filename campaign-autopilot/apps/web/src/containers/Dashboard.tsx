import { useEffect, useRef, useState, Suspense } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { askQuestion, decideAction, getGraph, getOrganic, getTrends, resetDemo, runAgent, saveGuardrails, simulateWeek } from '../api'
import { DashboardContext, useDashboard, type DashboardContextValue, type Panel } from '../dashboard-context'
import { CAMPAIGN_PURPOSE, displayChannel, money } from '../labels'
import { dashboardNav, href, navActive, type AppMode } from '../nav'
import { DEMO_STATE_KEY, ISSUES_KEY, useDemoState, useIssues } from '../hooks/useIssues'
import { IssueCard, Spinner, SyncChip } from '../components'
import { Mark } from '../brand'
import {
  graphFor, walkthroughAfterDecision, walkthroughAfterRun, walkthroughAfterWeek,
  walkthroughAnswer, walkthroughInitial, walkthroughOrganic, walkthroughReset, walkthroughTrends,
} from '../demo-seed'
import type { Campaign, DemoState, Guardrails } from '../types'

const pause = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

export default function Dashboard({ mode }: { mode: AppMode }) {
  return mode === 'demo' ? <WalkthroughShell /> : <LiveShell />
}

function WalkthroughShell() {
  const [state, setState] = useState<DemoState>(() => walkthroughInitial())
  const stateRef = useRef(state)
  stateRef.current = state
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const play = async (work: (current: DemoState) => DemoState, ok: string, fail: string) => {
    setBusy(true)
    try {
      await pause(450)
      const next = work(stateRef.current)
      setState(next)
      setNotice(ok)
    } catch {
      setNotice(fail)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Chrome
      mode="demo"
      notice={notice}
      setNotice={setNotice}
      value={{
        demo: state,
        graph: graphFor(state.phase),
        trends: walkthroughTrends,
        organic: walkthroughOrganic,
        busy,
        toast: setNotice,
        run: () => play(() => walkthroughAfterRun(), 'The walkthrough found the tired ad.', 'Could not run the walkthrough.'),
        approve: decision => play(
          current => walkthroughAfterDecision(current, decision),
          decision === 'approved' ? 'Approved — still a walkthrough. Nothing was sent to an ad account.' : 'Left as it is.',
          'The decision could not be recorded.',
        ),
        simulate: () => play(walkthroughAfterWeek, 'Next week measured from the walkthrough fixture.', 'Approve a change first, then measure the next week.'),
        reset: () => play(() => walkthroughReset(), 'Walkthrough reset.', 'Could not reset.'),
        saveRules: async (guardrails: Guardrails) => {
          setState(current => ({ ...current, guardrails }))
          setNotice('Saved in this walkthrough only. The live agent is unchanged.')
        },
        ask: async () => walkthroughAnswer(),
      }}
    />
  )
}

function LiveShell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { issues, isLoading, error, refetch } = useIssues()
  const demoQuery = useDemoState()
  const graphQuery = useQuery({ queryKey: ['graph'], queryFn: getGraph })
  const trendsQuery = useQuery({ queryKey: ['trends'], queryFn: getTrends })
  const organicQuery = useQuery({ queryKey: ['organic'], queryFn: getOrganic })
  const [notice, setNotice] = useState('')
  useEffect(() => { void refetch() }, [refetch])

  const applyState = (next: DemoState) => {
    queryClient.setQueryData(DEMO_STATE_KEY, next)
    queryClient.setQueryData(ISSUES_KEY, next.issues)
    void queryClient.invalidateQueries({ queryKey: ['graph'] })
  }
  const wrap = useMutation({
    mutationFn: (work: () => Promise<DemoState>) => work(),
    onSuccess: applyState,
  })
  const runWork = async (work: () => Promise<DemoState>, ok: string, fail: string) => {
    try {
      applyState(await wrap.mutateAsync(work))
      setNotice(ok)
    } catch {
      setNotice(fail)
    }
  }

  const demo = demoQuery.data
  if ((isLoading || demoQuery.isLoading) && !demo) {
    return (
      <div className="app">
        <header className="appbar"><button className="journey-brand" type="button"><Mark size={26} /> Journey Edge</button></header>
        <div className="content"><Spinner label="Loading your workspace from the agent…" /></div>
      </div>
    )
  }
  if ((error || demoQuery.error) && !demo) {
    return (
      <div className="app">
        <header className="appbar"><button className="journey-brand" type="button"><Mark size={26} /> Journey Edge</button></header>
        <div className="content">
          <div className="page-status panel">
            <h1>Live workspace</h1>
            <p>This is the live workspace. Start the agent on port 8000, then try again.</p>
            <div className="actions">
              <button className="primary" type="button" onClick={() => { void refetch(); void demoQuery.refetch() }}>Try again</button>
              <button className="secondary" type="button" onClick={() => void navigate('/demo/overview')}>Open the walkthrough</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  if (!demo) return null

  return (
    <Chrome
      mode="live"
      notice={notice}
      setNotice={setNotice}
      value={{
        demo: { ...demo, issues: issues.length ? issues : demo.issues },
        graph: graphQuery.data ?? null,
        trends: trendsQuery.data ?? null,
        organic: organicQuery.data ?? null,
        busy: wrap.isPending,
        toast: setNotice,
        run: () => runWork(runAgent, 'The agent finished this pass of the loop.', 'Could not run the agent. Check the connection.'),
        approve: decision => {
          const action = demo.actions[0]
          if (!action) return Promise.resolve()
          return runWork(
            () => decideAction(action.id, decision),
            decision === 'approved' ? 'Approved. The simulated write ran.' : 'Left as it is. Nothing was sent to an ad account.',
            'The decision could not be recorded.',
          )
        },
        simulate: () => runWork(simulateWeek, 'Next week measured from the recovery fixture.', 'Approve and apply a change before simulating the next week.'),
        reset: () => runWork(resetDemo, 'Workspace reset to the default seed and limits.', 'Could not reset.'),
        saveRules: guardrails => runWork(async () => {
          await saveGuardrails(guardrails)
          const result = await demoQuery.refetch()
          if (!result.data) throw new Error('Could not reload after saving limits.')
          return result.data
        }, 'Saved. Click Run agent for these rules to apply.', 'Could not save your limits.'),
        ask: askQuestion,
      }}
    />
  )
}

function Chrome({ mode, notice, setNotice, value }: {
  mode: AppMode
  notice: string
  setNotice: (msg: string) => void
  value: Omit<DashboardContextValue, 'mode' | 'to' | 'action' | 'setPanel' | 'openCampaign'>
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [panel, setPanel] = useState<Panel>('none')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const demo = value.demo
  const action = demo.actions[0]
  const pendingCount = demo.phase === 'awaiting_approval' ? 1 : 0
  const campaign = demo.campaigns.find(row => row.id === campaignId) ?? null
  const to = (rest: string) => href(mode, rest)
  const go = (path: string) => { setCampaignId(null); setPanel('none'); void navigate(path) }
  const nav = dashboardNav(mode)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(''), 4200)
    return () => window.clearTimeout(id)
  }, [notice, setNotice])

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu])

  useEffect(() => {
    if (panel === 'none' && !campaignId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPanel('none'); setCampaignId(null) } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel, campaignId])

  const ctx: DashboardContextValue = {
    ...value,
    mode,
    to,
    action,
    setPanel,
    openCampaign: setCampaignId,
  }

  return (
    <DashboardContext.Provider value={ctx}>
      <div className="app">
        <header className="appbar">
          <button className="journey-brand" type="button" onClick={() => go(to('/overview'))}><Mark size={26} /> Journey Edge</button>
          <span className="workspace">{mode === 'demo' ? 'Brew & Bloom · Walkthrough' : 'Brew & Bloom'}</span>
          <div className="appbar-right">
            <SyncChip kind={value.busy ? 'syncing' : 'ready'} />
            <button
              className="account"
              title="Mel Brooks"
              aria-label="Account menu for Mel Brooks"
              aria-haspopup="dialog"
              aria-expanded={panel === 'account'}
              onClick={() => setPanel(panel === 'account' ? 'none' : 'account')}
            >
              <span aria-hidden="true">MB</span>
            </button>
            <button className="burger" type="button" onClick={() => setMenu(true)} aria-label="Open menu">☰</button>
          </div>
        </header>
        {mode === 'demo' && (
          <p className="demo-ribbon">Worked example · made-up numbers · nothing is sent to an ad account</p>
        )}
        <nav className="tabs" aria-label="Sections">
          {nav.map(item => (
            <button key={item.to} type="button" onClick={() => go(item.to)} className={navActive(location.pathname, item.to) ? 'selected' : ''}>
              {item.label}
              {item.path === 'decisions' && pendingCount > 0 && <span className="count">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <div className="content">
          {notice && <div className="toast" role="status">{notice}</div>}
          <Suspense fallback={<Spinner label="Loading this page…" />}>
            <Outlet />
          </Suspense>
        </div>
        {menu && (
          <MenuOverlay
            pathname={location.pathname}
            pending={pendingCount}
            items={nav}
            go={item => { go(item); setMenu(false) }}
            close={() => setMenu(false)}
            openAccount={() => { setMenu(false); setPanel('account') }}
            backToSite={() => { setMenu(false); void navigate('/') }}
          />
        )}
        {campaign && <CampaignDrawer campaign={campaign} onClose={() => setCampaignId(null)} />}
        <SidePanel panel={panel} onClose={() => setPanel('none')} />
      </div>
    </DashboardContext.Provider>
  )
}

function MenuOverlay({ pathname, pending, items, go, close, openAccount, backToSite }: {
  pathname: string
  pending: number
  items: { to: string; label: string; path: string }[]
  go: (to: string) => void
  close: () => void
  openAccount: () => void
  backToSite: () => void
}) {
  return (
    <div className="menu-overlay" role="dialog" aria-label="Menu">
      <div className="menu-head">
        <button className="journey-brand" type="button" onClick={close}><Mark size={26} /> Journey Edge</button>
        <button className="menu-close" type="button" onClick={close} aria-label="Close menu">✕</button>
      </div>
      <nav>
        {items.map(item => (
          <button key={item.to} type="button" className={navActive(pathname, item.to) ? 'selected' : ''} onClick={() => go(item.to)}>
            {item.label}
            {item.path === 'decisions' && pending > 0 && <span className="count">{pending}</span>}
            <b>›</b>
          </button>
        ))}
      </nav>
      <div className="menu-foot">
        <SyncChip />
        <button className="secondary" type="button" onClick={openAccount}>Account</button>
        <button className="text-button" type="button" onClick={backToSite}>Back to the site</button>
      </div>
    </div>
  )
}

function CampaignDrawer({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { demo, action, to, approve, busy } = useDashboard()
  const navigate = useNavigate()
  const related = demo.issues.find(issue => issue.campaign === campaign.name)
  return (
    <div className="drawer-wrap">
      <button className="drawer-scrim" type="button" onClick={onClose} aria-label="Close campaign" />
      <aside className="drawer" role="dialog" aria-labelledby="campaign-drawer-title">
        <p className="eyebrow">{displayChannel(campaign.channel)}</p>
        <h2 id="campaign-drawer-title">{campaign.name}</h2>
        <p>{CAMPAIGN_PURPOSE[campaign.id] ?? campaign.channel}</p>
        <div className="drawer-stats">
          <div><span>Spent</span><strong>{money(campaign.spend)}</strong></div>
          <div><span>Earned per $1</span><strong>{campaign.roas == null ? '—' : money(campaign.roas, 2)}</strong></div>
          <div><span>Status</span><strong>{campaign.status}</strong></div>
        </div>
        {related ? (
          <IssueCard
            issue={related}
            phase={demo.phase}
            action={action}
            approving={busy}
            onApprove={() => approve('approved')}
            onClick={() => { onClose(); void navigate(to(`/todo/${related.id}`)) }}
          />
        ) : (
          <p className="muted">No open note on this campaign. That’s a good sign — it’s tracking close to normal.</p>
        )}
        <button className="secondary full" type="button" onClick={onClose}>Close</button>
      </aside>
    </div>
  )
}

function SidePanel({ panel, onClose }: { panel: Panel; onClose: () => void }) {
  const ctx = useDashboard()
  const navigate = useNavigate()
  if (panel === 'none') return null
  const title = panel === 'help' ? 'How this works' : panel === 'account' ? 'Mel Brooks' : 'Full record'
  return (
    <div className="drawer-wrap">
      <button className="drawer-scrim" type="button" onClick={onClose} aria-label="Close panel" />
      <aside className="drawer" role="dialog" aria-labelledby="side-panel-title">
        <p className="eyebrow">{panel === 'account' ? 'SIGNED IN' : panel === 'audit' ? 'THE RECORD' : 'HELP'}</p>
        <h2 id="side-panel-title">{title}</h2>
        {panel === 'help' && (
          <>
            <p>{ctx.mode === 'demo'
              ? 'This is a worked example for Brew & Bloom. The numbers stay put so you can follow one story — from “something’s off” to “you decide.”'
              : 'This workspace reads the live agent loop. If a change would cost money, it stops and asks you first.'}</p>
            <button className="primary full" type="button" onClick={() => { onClose(); void navigate(ctx.to('/todo')) }}>Open the to-do list</button>
          </>
        )}
        {panel === 'account' && (
          <>
            <p>{ctx.mode === 'demo'
              ? 'You’re walking through Brew & Bloom. Nothing is sent to Facebook, Google, or Shopify.'
              : 'You’re signed in as Mel. Writes still pause for your OK, and ad connectors stay simulated unless you change that.'}</p>
            <button className="secondary full" type="button" onClick={() => { onClose(); void navigate(ctx.to('/settings')) }}>Open settings</button>
            <button className="secondary full" type="button" onClick={() => ctx.setPanel('help')}>Help</button>
            <button className="primary full" type="button" onClick={() => { onClose(); void navigate('/') }}>Back to the site</button>
          </>
        )}
        {panel === 'audit' && (
          <>
            <ol className="timeline">
              {ctx.demo.events.slice(0, 8).map(item => (
                <li key={`${item.time}-${item.event}`}><span className="dot" /><div><strong>{item.event}</strong><p>{item.detail}</p><small>{item.time.slice(0, 16).replace('T', ' ')} UTC</small></div></li>
              ))}
            </ol>
            <button className="secondary full" type="button" onClick={onClose}>Close record</button>
          </>
        )}
      </aside>
    </div>
  )
}
