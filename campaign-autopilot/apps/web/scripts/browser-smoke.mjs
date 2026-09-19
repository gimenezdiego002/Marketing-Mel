import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'

const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath: chrome, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
page.on('pageerror', error => errors.push(`page: ${error.message}`))

try {
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /open live demo/i }).click()
  await page.getByText('Marketing autopilot').waitFor()
  await page.getByRole('button', { name: /reset/i }).click()
  await page.getByText(/demo reset and ready/i).waitFor()
  await page.getByRole('button', { name: /run agent/i }).click()
  await page.getByRole('heading', { name: 'Issues and opportunities' }).waitFor()
  await page.getByRole('button', { name: /creative fatigue is reducing/i }).click()
  await page.getByRole('heading', { name: /why the agent chose creative fatigue/i }).waitFor()
  await page.getByRole('button', { name: /review proposed action/i }).click()
  await page.getByRole('heading', { name: 'Approvals' }).waitFor()
  await page.getByRole('button', { name: /approve creative/i }).click()
  await page.getByText(/action applied/i).waitFor()
  await page.getByRole('button', { name: 'Experiments' }).click()
  await page.getByRole('button', { name: /simulate next week/i }).click()
  await page.getByRole('heading', { name: /creative refresh restored efficiency/i }).waitFor()
  await page.getByText('-28.1%').waitFor()
  await mkdir('artifacts', { recursive: true })
  await page.screenshot({ path: 'artifacts/demo-recovery.png', fullPage: true })

  await page.getByRole('button', { name: 'Campaigns' }).click()
  await page.getByRole('cell', { name: 'Meta Prospecting' }).waitFor()
  const rows = await page.locator('tbody tr').count()
  if (rows !== 4) throw new Error(`Campaigns table rendered ${rows} rows, expected 4`)

  await page.getByRole('button', { name: 'Trends' }).click()
  await page.getByRole('heading', { name: 'Direction of travel' }).waitFor()
  await page.getByRole('cell', { name: 'Meta Prospecting' }).waitFor()

  await page.getByRole('button', { name: 'Organic' }).click()
  await page.getByRole('heading', { name: 'Where revenue came from' }).waitFor()
  await page.getByRole('cell', { name: 'Organic / direct' }).waitFor()

  await page.getByRole('button', { name: 'Chat' }).click()
  await page.getByRole('button', { name: /ask/i }).click()
  await page.getByText(/creative fatigue: CTR/i).waitFor()

  await page.getByRole('button', { name: 'Guardrails' }).click()
  await page.getByRole('button', { name: /save guardrails/i }).click()
  await page.getByText(/guardrails saved/i).waitFor()

  if (errors.length) throw new Error(errors.join('\n'))
  console.log('Browser flow passed: run -> diagnose -> approve -> simulate -> measured recovery; campaigns, trends, organic, chat, and guardrails verified; 0 console errors.')
} finally {
  await browser.close()
}
