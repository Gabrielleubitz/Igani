// A listener, as the CRM's browser player would be: mints a listener token with the shared secret, connects to the
// relay's /listen socket, counts the frames per track, decodes the μ-law and reports the signal level of each side.
//
//   LISTEN_RELAY_SECRET=… node test/listen-client.mjs [ws://localhost:8080] [callId] [maxSeconds]
//     --bad-token    connect with a token signed by the wrong secret: the relay must answer 401
//
// Exit code 0 when frames flowed on both tracks (or, with --bad-token, when the relay refused), 1 otherwise.
import { createHmac } from 'node:crypto'
import WebSocket from 'ws'

const args = process.argv.slice(2)
const badIdx = args.indexOf('--bad-token')
const badToken = badIdx >= 0
if (badToken) args.splice(badIdx, 1)
const [base = 'ws://localhost:8080', callId = 'cltestcall00000000000001', maxSeconds = '10'] = args
const SECRET = process.env.LISTEN_RELAY_SECRET ?? 'dev-secret-dev-secret-dev'

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (secret) => {
  const now = Math.floor(Date.now() / 1000)
  const head = b64({ alg: 'HS256', typ: 'JWT' })
  const body = b64({ callId, sub: 'test-admin', roles: { inbound: 'rep', outbound: 'client' }, iat: now, exp: now + 120 })
  return `${head}.${body}.${createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`
}
const MULAW = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const u = ~i & 0xff, sign = u & 0x80, exp = (u >> 4) & 7, mant = u & 0x0f
  const s = (((mant << 3) + 0x84) << exp) - 0x84
  MULAW[i] = (sign ? -s : s) / 32768
}

const token = jwt(badToken ? 'wrong-secret-wrong-secret' : SECRET)
const ws = new WebSocket(`${base}/listen?token=${encodeURIComponent(token)}`)
const frames = [0, 0]
const energy = [0, 0]
const samples = [0, 0]
let hello = null
let streamAnnounced = false
const started = Date.now()
const finish = (why) => {
  const rms = (t) => (samples[t] ? Math.sqrt(energy[t] / samples[t]).toFixed(3) : '0')
  console.log(`listen-client: ${why} after ${((Date.now() - started) / 1000).toFixed(1)} s`)
  console.log(`  hello: ${JSON.stringify(hello)}  stream announced: ${streamAnnounced}`)
  console.log(`  inbound (track 0): ${frames[0]} frames, ${samples[0]} samples, rms ${rms(0)}`)
  console.log(`  outbound (track 1): ${frames[1]} frames, ${samples[1]} samples, rms ${rms(1)}`)
  const ok = frames[0] > 0 && frames[1] > 0 && Number(rms(0)) > 0.05 && Number(rms(1)) > 0.05
  console.log(ok ? '  RESULT: audio flowed on both tracks' : '  RESULT: no usable audio')
  process.exit(ok ? 0 : 1)
}
const deadline = setTimeout(() => finish('time is up'), Number(maxSeconds) * 1000)

ws.on('open', () => console.log(`listen-client: connected to ${base}/listen for call ${callId}`))
ws.on('message', (data, isBinary) => {
  if (!isBinary) {
    const msg = JSON.parse(data.toString())
    if (msg.type === 'hello') hello = msg
    else if (msg.type === 'stream') streamAnnounced = true
    else if (msg.type === 'ended') {
      clearTimeout(deadline)
      finish('relay said the call ended')
    }
    return
  }
  const track = data[0]
  if (track > 1) return
  frames[track]++
  for (let i = 1; i < data.length; i++) {
    const v = MULAW[data[i]]
    energy[track] += v * v
  }
  samples[track] += data.length - 1
})
ws.on('unexpected-response', (_req, res) => {
  console.log(`listen-client: handshake refused with HTTP ${res.statusCode}${badToken ? ' (expected: bad token)' : ''}`)
  process.exit(badToken ? 0 : 1)
})
ws.on('close', (code, reason) => {
  clearTimeout(deadline)
  if (!frames[0] && !frames[1]) {
    console.log(`listen-client: closed ${code} ${reason.toString()} with no audio`)
    process.exit(1)
  }
  finish(`socket closed ${code} ${reason.toString()}`)
})
ws.on('error', (e) => {
  if (!badToken) console.error('listen-client: error', e.message)
})
