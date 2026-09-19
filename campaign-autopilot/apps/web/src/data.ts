export type Status = 'New' | 'Diagnosed' | 'Awaiting approval' | 'Applied' | 'Measuring'
export type Issue = { id: string; title: string; campaign: string; channel: string; severity: 'High' | 'Medium' | 'Low'; confidence: number; status: Status; impact: string; summary: string; evidence: string[] }

export const issues: Issue[] = [
  { id: 'creative-fatigue', title: 'Creative fatigue is reducing prospecting efficiency', campaign: 'Meta Prospecting', channel: 'Meta', severity: 'High', confidence: 92, status: 'Awaiting approval', impact: 'Estimated $1,240 monthly recovery', summary: 'Frequency has risen while CTR fell below its rolling baseline.', evidence: ['CTR 1.08% vs. 1.72% baseline', 'Frequency 3.8 vs. 2.4 baseline', 'CPM up 18% week over week'] },
  { id: 'retargeting-scale', title: 'Room to scale a healthy retargeting campaign', campaign: 'Meta Retargeting', channel: 'Meta', severity: 'Low', confidence: 86, status: 'Diagnosed', impact: 'Estimated +$530 monthly revenue', summary: 'ROAS is consistently above target with spare budget capacity.', evidence: ['ROAS 5.2× vs. 3.0× target', 'Budget utilization 78%', 'Stable CPA for 21 days'] },
  { id: 'email-clicks', title: 'Welcome-flow clicks are trending down', campaign: 'Klaviyo Welcome Flow', channel: 'Email', severity: 'Medium', confidence: 76, status: 'New', impact: 'Needs investigation', summary: 'Open rate remains steady but click-through rate is declining.', evidence: ['Open rate 42.1%', 'CTR 1.3% vs. 2.0% baseline'] }
]

export const campaigns = [
  ['Meta Prospecting', 'Meta', '$12,840', '2.1×', '-18%', 'Needs attention'],
  ['Meta Retargeting', 'Meta', '$4,460', '5.2×', '+8%', 'Opportunity'],
  ['Google Brand Search', 'Google', '$2,180', '4.6×', '+2%', 'Healthy'],
  ['Klaviyo Welcome Flow', 'Email', '$0', '—', '-6%', 'Needs attention']
]
