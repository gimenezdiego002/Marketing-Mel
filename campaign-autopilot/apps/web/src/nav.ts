export type AppMode = 'demo' | 'live'

export const dashboardPages = [
  { path: 'overview', label: 'Overview' },
  { path: 'todo', label: 'To do' },
  { path: 'decisions', label: 'Decisions' },
  { path: 'campaigns', label: 'Campaigns' },
  { path: 'experiments', label: 'Experiments' },
  { path: 'ask', label: 'Ask a question' },
  { path: 'settings', label: 'Settings' },
] as const

export function basePath(mode: AppMode) {
  return mode === 'demo' ? '/demo' : '/app'
}

export function href(mode: AppMode, rest: string) {
  const suffix = rest.startsWith('/') ? rest : `/${rest}`
  return `${basePath(mode)}${suffix}`
}

export function dashboardNav(mode: AppMode) {
  return dashboardPages.map(item => ({ to: href(mode, `/${item.path}`), label: item.label, path: item.path }))
}

export function navActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`)
}
