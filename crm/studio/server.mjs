// Offer studio terminal bridge. LOCAL ONLY: never deployed, listens on 127.0.0.1.
//
// The CRM's studio page (localhost:3100/admin/offers/studio/<slug>) connects here over a WebSocket and gets a real
// terminal running `claude` inside crm/offers/<slug>/. One terminal per offer; it survives page reloads, and
// reconnecting replays the recent output. A random token (written to studio/.token, read by the CRM page) plus an
// Origin check stop other websites from opening a shell through this port.

import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pty from 'node-pty'
import { WebSocketServer } from 'ws'

const HERE = dirname(fileURLToPath(import.meta.url))
const CRM = join(HERE, '..')
const PORT = Number(process.env.STUDIO_PORT ?? 3199)
const APP_PORT = Number(process.env.STUDIO_APP_PORT ?? 3100)
const ALLOWED_ORIGINS = new Set([`http://localhost:${APP_PORT}`, `http://127.0.0.1:${APP_PORT}`])
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/
const SCROLLBACK = 400_000

const token = randomBytes(24).toString('hex')
writeFileSync(join(HERE, '.token'), token, { mode: 0o600 })

/** slug → { term, buffer, sockets } */
const sessions = new Map()

/**
 * The terminal gets your normal environment, minus the CRM's own secrets and any Claude Code session markers
 * (so a studio started from inside another Claude session still opens a normal, independent `claude`).
 */
function cleanEnv() {
  const env = { ...process.env }
  for (const k of Object.keys(env)) {
    if (k.startsWith('CLAUDE_CODE_') || k === 'CLAUDECODE' || k.startsWith('NEXT_') || k.startsWith('__NEXT') || k === 'NODE_ENV') delete env[k]
  }
  return env
}

function startSession(slug) {
  const cwd = join(CRM, 'offers', slug)
  if (!existsSync(cwd)) mkdirSync(cwd, { recursive: true })
  const shell = process.env.SHELL || '/bin/zsh'
  // Start Claude straight away; when it exits you land in a normal shell in the same folder (type `claude` to restart).
  const term = pty.spawn(shell, ['-l', '-i', '-c', `claude; exec ${shell} -l -i`], {
    name: 'xterm-256color',
    cols: 120,
    rows: 36,
    cwd,
    env: { ...cleanEnv(), OFFER_SLUG: slug, OFFER_CRM_DIR: CRM, FORCE_COLOR: '1' },
  })
  const s = { term, buffer: '', sockets: new Set() }
  term.onData((d) => {
    s.buffer = (s.buffer + d).slice(-SCROLLBACK)
    for (const ws of s.sockets) if (ws.readyState === 1) ws.send(d)
  })
  term.onExit(() => {
    for (const ws of s.sockets) ws.close(1000, 'terminal exited')
    sessions.delete(slug)
  })
  sessions.set(slug, s)
  return s
}

const wss = new WebSocketServer({ host: '127.0.0.1', port: PORT, maxPayload: 1 << 20 })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const slug = url.searchParams.get('slug') ?? ''
  if (!ALLOWED_ORIGINS.has(req.headers.origin ?? '') || url.searchParams.get('token') !== token || !SLUG_RE.test(slug)) {
    ws.close(1008, 'not allowed')
    return
  }
  if (url.searchParams.get('restart') === '1') sessions.get(slug)?.term.kill()
  const s = sessions.get(slug) ?? startSession(slug)
  s.sockets.add(ws)
  if (s.buffer) ws.send(s.buffer)

  ws.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      return
    }
    if (msg.type === 'input' && typeof msg.data === 'string') s.term.write(msg.data)
    else if (msg.type === 'resize' && Number.isInteger(msg.cols) && Number.isInteger(msg.rows)) s.term.resize(Math.max(20, Math.min(msg.cols, 400)), Math.max(5, Math.min(msg.rows, 200)))
  })
  ws.on('close', () => s.sockets.delete(ws))
})

wss.on('listening', () => console.log(`[studio] terminal bridge on ws://127.0.0.1:${PORT}`))
const shutdown = () => {
  for (const s of sessions.values()) s.term.kill()
  rmSync(join(HERE, '.token'), { force: true })
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
