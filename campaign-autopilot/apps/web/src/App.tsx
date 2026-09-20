import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Spinner } from './components'
import Dashboard from './containers/Dashboard'

const Landing = lazy(() => import('./pages/Landing'))
const Overview = lazy(() => import('./pages/Overview'))
const Todo = lazy(() => import('./pages/Todo'))
const IssueDetail = lazy(() => import('./pages/IssueDetail'))
const Decisions = lazy(() => import('./pages/Decisions'))
const Campaigns = lazy(() => import('./pages/Campaigns'))
const Experiments = lazy(() => import('./pages/Experiments'))
const Ask = lazy(() => import('./pages/Ask'))
const Settings = lazy(() => import('./pages/Settings'))

function workspaceRoutes() {
  return (
    <>
      <Route index element={<Navigate to="overview" replace />} />
      <Route path="overview" element={<Overview />} />
      <Route path="todo" element={<Todo />} />
      <Route path="todo/:issueId" element={<IssueDetail />} />
      <Route path="decisions" element={<Decisions />} />
      <Route path="campaigns" element={<Campaigns />} />
      <Route path="experiments" element={<Experiments />} />
      <Route path="ask" element={<Ask />} />
      <Route path="settings" element={<Settings />} />
    </>
  )
}

function LegacyDashboardRedirect() {
  const location = useLocation()
  return <Navigate to={`/demo${location.pathname}${location.search}`} replace />
}

export default function App() {
  return (
    <Suspense fallback={<div className="app"><Spinner label="Loading Journey Edge…" /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="demo" element={<Dashboard mode="demo" />}>{workspaceRoutes()}</Route>
        <Route path="app" element={<Dashboard mode="live" />}>{workspaceRoutes()}</Route>
        <Route path="overview" element={<LegacyDashboardRedirect />} />
        <Route path="todo" element={<LegacyDashboardRedirect />} />
        <Route path="todo/:issueId" element={<LegacyDashboardRedirect />} />
        <Route path="decisions" element={<LegacyDashboardRedirect />} />
        <Route path="campaigns" element={<LegacyDashboardRedirect />} />
        <Route path="experiments" element={<LegacyDashboardRedirect />} />
        <Route path="ask" element={<LegacyDashboardRedirect />} />
        <Route path="settings" element={<LegacyDashboardRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
