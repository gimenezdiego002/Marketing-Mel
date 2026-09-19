import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const output = join(root, 'walkthrough')
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const ffmpeg = 'C:\\Users\\simok38\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build-shared\\bin\\ffmpeg.exe'
const profile = join(output, 'chrome-profile')
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

async function until(test, timeout = 20000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    try { const value = await test(); if (value) return value } catch {}
    await wait(250)
  }
  throw new Error('Timed out while waiting for the local app.')
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)))
  })
}

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
const server = spawn('cmd.exe', ['/d', '/s', '/c', 'npm run dev -- --host 127.0.0.1 --port 4173'], { cwd: root, stdio: 'ignore' })
const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=9222', '--window-size=1440,900', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check'], { stdio: 'ignore' })

try {
  await until(async () => (await fetch('http://127.0.0.1:4173')).ok)
  const pages = await until(async () => {
    const pages = await (await fetch('http://127.0.0.1:9222/json')).json()
    return pages.find(page => page.type === 'page')
  })
  const socket = new WebSocket(pages.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let id = 0
  const pending = new Map()
  socket.onmessage = event => { const message = JSON.parse(event.data); if (message.id) { pending.get(message.id)?.(message); pending.delete(message.id) } }
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id
    pending.set(messageId, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result))
    socket.send(JSON.stringify({ id: messageId, method, params }))
  })
  const evaluate = expression => cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  const clickText = async text => {
    const result = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)})); if (!button) return false; button.click(); return true })()`)
    if (!result.result.value) throw new Error(`Could not find button: ${text}`)
    await wait(500)
  }
  await cdp('Page.navigate', { url: 'http://127.0.0.1:4173/?view=app' })
  await wait(3000)
  console.log((await evaluate('document.body.innerText')).result.value)
  await until(async () => {
    const result = await evaluate(`Boolean(document.querySelector('.tabs button'))`)
    return result.result.value
  })
  await wait(500)
  const scenes = []
  const snap = async name => {
    const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
    const file = join(output, `${String(scenes.length + 1).padStart(2, '0')}-${name}.png`)
    await writeFile(file, Buffer.from(result.data, 'base64'))
    scenes.push(file)
  }

  await snap('overview')
  await clickText('To do')
  await snap('to-do-list')
  await evaluate(`document.querySelector('.issue-card')?.click()`); await wait(500)
  await snap('issue-evidence')
  await clickText('Decisions')
  await snap('approval')
  await clickText('Yes, do it')
  await wait(800)
  await snap('approval-confirmed')
  await clickText('Experiments')
  await snap('experiment-tracking')
  await clickText('Ask a question')
  await clickText('Why did the Facebook ad slow down?')
  await snap('plain-english-answer')
  await clickText('Settings')
  await snap('guardrails')

  const inputs = scenes.flatMap(file => ['-loop', '1', '-t', '7.5', '-i', file])
  const streams = scenes.map((_, index) => `[${index}:v]scale=1440:900:force_original_aspect_ratio=decrease,pad=1440:900:(ow-iw)/2:(oh-ih)/2,format=yuv420p[v${index}]`).join(';')
  const concat = scenes.map((_, index) => `[v${index}]`).join('') + `concat=n=${scenes.length}:v=1:a=0[out]`
  await run(ffmpeg, ['-y', ...inputs, '-filter_complex', `${streams};${concat}`, '-map', '[out]', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(root, 'frontend-walkthrough-60s.mp4')])
  socket.close()
  console.log(`Created ${join(root, 'frontend-walkthrough-60s.mp4')}`)
} finally {
  browser.kill(); server.kill()
}
