// Demo content for the dashboard. Every issue carries a plain-English reading plus the exact
// figure it came from, so the interface never asks the reader to already know the jargon.

export type Status = 'New' | 'Explained' | 'Needs your OK' | 'Done' | 'Watching results'
export type Severity = 'Fix first' | 'Worth a look' | 'Good news'
export type Evidence = { plain: string; metric: string }
export type Action = { title: string; detail: string; risk: string; ifItWorks: string; spending: string }
export type Issue = { id: string; title: string; campaign: string; channel: string; severity: Severity; confidence: number; status: Status; impact: string; summary: string; evidence: Evidence[]; action: Action }

export const issues: Issue[] = [
  {
    id: 'creative-fatigue', title: 'People are getting tired of your best ad', campaign: 'Meta Prospecting', channel: 'Facebook & Instagram',
    severity: 'Fix first', confidence: 92, status: 'Needs your OK', impact: 'Could win back about $1,240 a month',
    summary: 'The same people keep seeing it, and fewer of them are clicking than they used to.',
    evidence: [
      { plain: 'Fewer people click when they see it', metric: '1.08% click, usually 1.72%' },
      { plain: 'The same people see it too often', metric: '3.8 times each, usually 2.4' },
      { plain: 'Every thousand views costs you more', metric: 'up 18% since last week' }
    ],
    action: { title: 'Swap in fresh ad images', detail: 'Put two new versions live and switch off the tired one, once you say yes.', risk: 'Needs your OK first', ifItWorks: 'About $1,240 a month back', spending: 'Stays exactly the same' }
  },
  {
    id: 'retargeting-scale', title: 'One ad is doing well and has room to grow', campaign: 'Meta Retargeting', channel: 'Facebook & Instagram',
    severity: 'Good news', confidence: 86, status: 'Explained', impact: 'Could add about $530 a month',
    summary: 'It earns far more than you set out to make, and it is not using all the money set aside for it.',
    evidence: [
      { plain: 'Earns well above what you aimed for', metric: '$5.20 back per $1, aim was $3.00' },
      { plain: 'Has budget left over each month', metric: '78% of its budget used' },
      { plain: 'Costs have held steady for three weeks', metric: 'same cost per sale for 21 days' }
    ],
    action: { title: 'Give this ad a bigger budget', detail: 'Move some spend into the ad that is already paying for itself, once you say yes.', risk: 'Needs your OK first', ifItWorks: 'About $530 a month extra', spending: 'Never past the limit you set' }
  },
  {
    id: 'email-clicks', title: 'People open your welcome email but stop there', campaign: 'Klaviyo Welcome Flow', channel: 'Email',
    severity: 'Worth a look', confidence: 76, status: 'New', impact: 'Worth understanding before you change anything',
    summary: 'Just as many people open it as before, but fewer of them click through to your store.',
    evidence: [
      { plain: 'Just as many people open it', metric: '42.1% open it' },
      { plain: 'Fewer of them click through', metric: '1.3% click, usually 2.0%' }
    ],
    action: { title: 'Find out which links people skip', detail: 'We’ll look at what the email points to before suggesting any change.', risk: 'Safe — nothing changes yet', ifItWorks: 'A clear reason for the drop', spending: 'Nothing to spend' }
  }
]

export type Campaign = { name: string; purpose: string; channel: string; spend: string; earned: string; trend: string; status: string }

export const campaigns: Campaign[] = [
  { name: 'Meta Prospecting', purpose: 'Reaches people who have never heard of you', channel: 'Facebook & Instagram', spend: '$12,840', earned: '$2.10', trend: '-18%', status: 'Needs attention' },
  { name: 'Meta Retargeting', purpose: 'Reminds people who already visited your store', channel: 'Facebook & Instagram', spend: '$4,460', earned: '$5.20', trend: '+8%', status: 'Opportunity' },
  { name: 'Google Brand Search', purpose: 'Shows up when people search for you by name', channel: 'Google', spend: '$2,180', earned: '$4.60', trend: '+2%', status: 'Healthy' },
  { name: 'Klaviyo Welcome Flow', purpose: 'Emails people automatically when they sign up', channel: 'Email', spend: '$0', earned: 'No ad cost', trend: '-6%', status: 'Needs attention' }
]
