// Igani listen relay: forwards a live call's audio from Twilio Media Streams to admins listening in the CRM.
//
//   Twilio ──wss /twilio──▶ relay ──wss /listen?token=…──▶ admin's browser(s)
//
// One room per CRM call id. Twilio sends 20 ms μ-law frames per track; each is forwarded to every listener as a small
// binary frame (1 byte track id: 0 inbound, 1 outbound; then the raw μ-law bytes). Nothing about the audio is logged
// or stored. When the last listener leaves, the relay tells the CRM so it stops the stream (and closes Twilio's socket
// itself, which stops it too). See README.md for deploying and testing.
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT ?? 8080)
const SECRET = process.env.LISTEN_RELAY_SECRET ?? ''
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? ''
const CRM_URL = (process.env.CRM_URL ?? '').replace(/\/+$/, '')
const MAX_BUFFERED = 64 * 1024 // a listener this far behind skips frames rather than building up delay
const MAX_LISTENERS = 6
const MAX_ROOMS = 200
const EMPTY_ROOM_GRACE_MS = 3000 // a browser reconnecting gets this long before the stream is torn down
const CALL_ID = /^[a-z0-9]{20,40}$/i

if (SECRET.length < 16) {
  console.error('LISTEN_RELAY_SECRET is missing (at least 16 characters, the same value the CRM has)')
  process.exit(1)
}
if (!CRM_URL) console.warn('CRM_URL is not set: the CRM will not be told when the last listener leaves (streams then run until the call ends)')

const log = (...a) => console.log(new Date().toISOString(), ...a)

/** @type {Map<string, { twilio: import('ws').WebSocket | null, listeners: Set<import('ws').WebSocket>, roles: string | null, endTimer: NodeJS.Timeout | null }>} */
const rooms = new Map()
const room = (callId) => {
  let r = rooms.get(callId)
  if (!r) {
    r = { twilio: null, listeners: new Set(), roles: null, endTimer: null }
    rooms.set(callId, r)
  }
  return r
}
const rolesOf = (s) => {
  const m = /^(rep|client),(rep|client)$/.exec(s ?? '')
  return m ? { inbound: m[1], outbound: m[2] } : null
}
const sendJson = (ws, obj) => {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj))
}

// ── auth ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const safeEqual = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}
/** The token the CRM put on the stream: `<expiry>.<hex hmac(callId.expiry)>`. */
function streamTokenOk(callId, token) {
  const [exp, mac] = String(token ?? '').split('.')
  if (!/^\d{9,11}$/.test(exp ?? '') || !/^[0-9a-f]{64}$/.test(mac ?? '')) return false
  if (Number(exp) < Date.now() / 1000) return false
  return safeEqual(mac, createHmac('sha256', SECRET).update(`${callId}.${exp}`).digest('hex'))
}
/** The admin's listener token: HS256 JWT { callId, sub, roles, exp } signed with the shared secret. */
function listenerClaims(token) {
  const parts = String(token ?? '').split('.')
  if (parts.length !== 3) return null
  const [h, b, s] = parts
  if (!safeEqual(s, createHmac('sha256', SECRET).update(`${h}.${b}`).digest('base64url'))) return null
  try {
    const head = JSON.parse(Buffer.from(h, 'base64url').toString())
    const claims = JSON.parse(Buffer.from(b, 'base64url').toString())
    if (head.alg !== 'HS256' || typeof claims.callId !== 'string' || !CALL_ID.test(claims.callId)) return null
    if (typeof claims.exp !== 'number' || claims.exp < Date.now() / 1000) return null
    return claims
  } catch {
    return null
  }
}
/** Twilio signs the WebSocket handshake (X-Twilio-Signature over the stream URL). Checked when we know the auth token. */
function twilioSignatureOk(req) {
  const sig = req.headers['x-twilio-signature']
  if (!sig || !TWILIO_AUTH_TOKEN) return true // the start message's token is the real gate
  for (const scheme of ['wss', 'https']) {
    const expected = createHmac('sha1', TWILIO_AUTH_TOKEN).update(`${scheme}://${req.headers.host}${req.url}`).digest('base64')
    if (safeEqual(sig, expected)) return true
  }
  return false
}

// ── rooms ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** The stream is over (the call ended, or Twilio stopped it): listeners are told and let go. */
function endRoom(callId, r) {
  if (r.endTimer) clearTimeout(r.endTimer)
  for (const l of r.listeners) {
    sendJson(l, { type: 'ended' })
    l.close(1000, 'call ended')
  }
  r.listeners.clear()
  if (r.twilio) {
    const t = r.twilio
    r.twilio = null
    t.close(1000, 'done')
  }
  rooms.delete(callId)
}
/** Nobody is listening any more: after a short grace, drop Twilio's socket and tell the CRM to stop the stream. */
function emptyRoom(callId, r) {
  if (r.endTimer) clearTimeout(r.endTimer)
  r.endTimer = setTimeout(() => {
    r.endTimer = null
    if (r.listeners.size) return
    if (r.twilio) {
      const t = r.twilio
      r.twilio = null
      t.close(1000, 'no listeners')
    }
    rooms.delete(callId)
    void tellCrmEnded(callId)
  }, EMPTY_ROOM_GRACE_MS)
}
async function tellCrmEnded(callId) {
  if (!CRM_URL) return
  const body = JSON.stringify({ callId, at: Date.now() })
  const signature = createHmac('sha256', SECRET).update(body).digest('hex')
  try {
    const res = await fetch(`${CRM_URL}/api/public/listen/ended`, { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-listen-signature': signature }, signal: AbortSignal.timeout(8000) })
    log('crm told: last listener left', callId, res.status)
  } catch (err) {
    log('crm unreachable for', callId, err instanceof Error ? err.message : err)
  }
}

// ── Twilio side ─────────────────────────────────────────────────────────────────────────────────────────────────────
function onTwilio(ws) {
  let callId = null
  let r = null
  ws.on('message', (data, isBinary) => {
    if (isBinary) return
    let msg
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return
    }
    switch (msg.event) {
      case 'connected':
        return
      case 'start': {
        const cp = msg.start?.customParameters ?? {}
        const id = String(cp.callId ?? '')
        if (!CALL_ID.test(id) || !streamTokenOk(id, cp.token)) {
          log('twilio: refused a stream with a bad token', id || '?')
          ws.close(1008, 'bad token')
          return
        }
        if (!rooms.has(id) && rooms.size >= MAX_ROOMS) {
          ws.close(1013, 'full')
          return
        }
        callId = id
        r = room(id)
        if (r.twilio && r.twilio !== ws) r.twilio.close(1000, 'replaced')
        r.twilio = ws
        r.roles = typeof cp.roles === 'string' ? cp.roles : r.roles
        log('stream started', callId, 'listeners:', r.listeners.size)
        for (const l of r.listeners) sendJson(l, { type: 'stream', roles: rolesOf(r.roles) })
        if (!r.listeners.size) emptyRoom(callId, r) // nobody waiting for it (they left while Twilio was connecting)
        return
      }
      case 'media': {
        if (!r) return
        const m = msg.media
        if (!m || typeof m.payload !== 'string') return
        const payload = Buffer.from(m.payload, 'base64')
        const frame = Buffer.allocUnsafe(payload.length + 1)
        frame[0] = m.track === 'outbound' ? 1 : 0
        payload.copy(frame, 1)
        for (const l of r.listeners) if (l.readyState === 1 && l.bufferedAmount <= MAX_BUFFERED) l.send(frame, { binary: true })
        return
      }
      case 'stop':
        if (r && r.twilio === ws) {
          log('stream stopped', callId)
          r.twilio = null
          endRoom(callId, r)
        }
        return
      default:
        return
    }
  })
  ws.on('close', () => {
    if (r && r.twilio === ws) {
      log('stream socket closed', callId)
      r.twilio = null
      endRoom(callId, r)
    }
  })
  ws.on('error', () => undefined)
}

// ── listener side ───────────────────────────────────────────────────────────────────────────────────────────────────
function onListener(ws, claims) {
  const callId = claims.callId
  if (!rooms.has(callId) && rooms.size >= MAX_ROOMS) {
    ws.close(1013, 'full')
    return
  }
  const r = room(callId)
  if (r.listeners.size >= MAX_LISTENERS) {
    ws.close(1013, 'full')
    return
  }
  if (r.endTimer) {
    clearTimeout(r.endTimer)
    r.endTimer = null
  }
  r.listeners.add(ws)
  ws.isAlive = true
  ws.on('pong', () => {
    ws.isAlive = true
  })
  sendJson(ws, { type: 'hello', callId, roles: rolesOf(r.roles) ?? claims.roles ?? null, streaming: Boolean(r.twilio) })
  log('listener joined', callId, 'listeners:', r.listeners.size)
  ws.on('message', () => undefined) // listeners have nothing to say; nothing goes back to the call
  ws.on('close', () => {
    r.listeners.delete(ws)
    log('listener left', callId, 'listeners:', r.listeners.size)
    if (!r.listeners.size && rooms.get(callId) === r) emptyRoom(callId, r)
  })
  ws.on('error', () => undefined)
}

// ── server ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const server = createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' })
    res.end(`ok rooms=${rooms.size}\n`)
    return
  }
  res.writeHead(404)
  res.end()
})
const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024, perMessageDeflate: false })
const refuse = (socket, code) => {
  socket.write(`HTTP/1.1 ${code} ${code === 401 ? 'Unauthorized' : code === 403 ? 'Forbidden' : 'Not Found'}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`)
  socket.destroy()
}
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://relay')
  if (url.pathname === '/twilio') {
    if (!twilioSignatureOk(req)) {
      log('twilio: bad X-Twilio-Signature')
      return refuse(socket, 403)
    }
    return wss.handleUpgrade(req, socket, head, (ws) => onTwilio(ws))
  }
  if (url.pathname === '/listen') {
    const claims = listenerClaims(url.searchParams.get('token'))
    if (!claims) {
      log('listener refused: bad or expired token')
      return refuse(socket, 401)
    }
    return wss.handleUpgrade(req, socket, head, (ws) => onListener(ws, claims))
  }
  refuse(socket, 404)
})
// keep listeners honest: a browser that went away without closing is dropped within a minute
setInterval(() => {
  for (const r of rooms.values())
    for (const l of r.listeners) {
      if (l.isAlive === false) {
        l.terminate()
        continue
      }
      l.isAlive = false
      l.ping()
    }
}, 30_000).unref()

server.listen(PORT, () => log(`igani-listen relay listening on :${PORT}`))
for (const sig of ['SIGTERM', 'SIGINT'])
  process.on(sig, () => {
    for (const [id, r] of rooms) endRoom(id, r)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 2000).unref()
  })
