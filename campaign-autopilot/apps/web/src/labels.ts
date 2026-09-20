import type { Action, Issue } from './types'

export function displayStatus(issue: Issue, phase: string, action?: Action): string {
  if (issue.status === 'Approved' || issue.status === 'approved') return 'Approved'
  if (phase === 'blocked' || action?.status === 'blocked') return 'Blocked'
  if (phase === 'recommended' || action?.status === 'recommended') return 'Recommendation'
  if (phase === 'rejected') return 'Left as it is'
  if (issue.status === 'Awaiting approval') return 'Needs your OK'
  if (issue.status === 'Actioned') return 'Watching results'
  if (issue.status === 'Resolved') return 'Done'
  if (issue.status === 'Blocked') return 'Blocked'
  if (issue.status === 'Recommended') return 'Recommendation'
  return issue.status
}

export function displaySeverity(severity: string): string {
  if (severity === 'High') return 'Fix first'
  if (severity === 'Medium') return 'Worth a look'
  if (severity === 'Low') return 'Good news'
  return severity
}

export function displayChannel(channel: string): string {
  if (channel === 'Meta') return 'Facebook & Instagram'
  if (channel === 'Google') return 'Google'
  if (channel === 'Klaviyo') return 'Email'
  return channel
}

export const CAMPAIGN_PURPOSE: Record<string, string> = {
  meta_prospecting: 'Reaches people who have never heard of you',
  meta_retargeting: 'Reminds people who already visited your store',
  google_brand_search: 'Shows up when people search for you by name',
  klaviyo_welcome_flow: 'Emails people automatically when they sign up',
}

export function money(value: number, digits = 0): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export function causeHeading(type: string): string {
  if (type === 'landing_page_or_offer') return 'Why the agent chose the landing page or offer'
  if (type === 'auction_pressure') return 'Why the agent chose auction pressure'
  if (type === 'no_clear_diagnosis') return 'Why the agent could not pick one cause'
  return 'Why the agent chose creative fatigue'
}
