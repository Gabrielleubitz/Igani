// Pretends to be Twilio Media Streams: connects to the relay's /twilio socket and replays a call (a two-tone test
// signal, or a WAV file) as Twilio-format messages: connected → start → media every 20 ms (one frame per track) → stop.
//
//   LISTEN_RELAY_SECRET=… node test/fake-twilio.mjs [ws://localhost:8080/twilio] [callId] [seconds]
//     --wav path.wav     replay a PCM WAV instead of tones (mono → both tracks; stereo → L = inbound, R = outbound)
//     --bad-token        send a wrong token: the relay must close the socket with 1008 and forward nothing
//
// Set TWILIO_AUTH_TOKEN too and the handshake carries a real X-Twilio-Signature, as Twilio's would.
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import WebSocket from 'ws'

const args = process.argv.slice(2)
const flag = (name) => {
  const i = args.indexOf(name)
  if (i < 0) return null
  const [, v] = args.splice(i, name === '--bad-token' ? 1 : 2)
  return v ?? true
}
const badToken = Boolean(flag('--bad-token'))
const wavPath = flag('--wav')
const [url = 'ws://localhost:8080/twilio', callId = 'cltestcall00000000000001', seconds = '3'] = args
const SECRET = process.env.LISTEN_RELAY_SECRET ?? 'dev-secret-dev-secret-dev'
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? ''

// ── G.711 μ-law encoder ─────────────────────────────────────────────────────────────────────────────────────────────
function ulaw(sample) {
  const BIAS = 0x84, CLIP = 32635
  let s = Math.max(-32768, Math.min(32767, Math.round(sample)))
  const sign = s < 0 ? 0x80 : 0
  if (sign) s = -s
  if (s > CLIP) s = CLIP
  s += BIAS
  let exp = 7
  for (let mask = 0x4000; (s & mask) === 0 && exp > 0; exp--, mask >>= 1);
  const mant = (s >> (exp + 3)) & 0x0f
  return ~(sign | (exp << 4) | mant) & 0xff
}

// ── the audio: two tones, or a WAV ──────────────────────────────────────────────────────────────────────────────────
/** @returns {{ inbound: Int16Array, outbound: Int16Array }} 8 kHz PCM for each track */
function source() {
  const n = Math.round(Number(seconds) * 8000)
  if (!wavPath) {
    const tone = (hz, gain) => Int16Array.from({ length: n }, (_, i) => Math.round(Math.sin((2 * Math.PI * hz * i) / 8000) * gain))
    return { inbound: tone(440, 9000), outbound: tone(660, 9000) }
  }
  const buf = readFileSync(wavPath)
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV file')
  let off = 12, fmt = null, data = null
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4), size = buf.readUInt32LE(off + 4)
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(off + 8), channels: buf.readUInt16LE(off + 10), rate: buf.readUInt32LE(off + 12), bits: buf.readUInt16LE(off + 22) }
    if (id === 'data') data = buf.subarray(off + 8, off + 8 + size)
    off += 8 + size + (size % 2)
  }
  if (!fmt || !data || fmt.format !== 1 || fmt.bits !== 16) throw new Error('only 16-bit PCM WAV is supported')
  const frames = data.length / 2 / fmt.channels
  const step = fmt.rate / 8000 // nearest-sample resampling is fine for a test signal
  const out = Math.min(n, Math.floor(frames / step))
  const pick = (ch) => Int16Array.from({ length: out }, (_, i) => data.readInt16LE((Math.floor(i * step) * fmt.channels + ch) * 2))
  const left = pick(0)
  return { inbound: left, outbound: fmt.channels > 1 ? pick(1) : left }
}

const audio = source()
const exp = Math.floor(Date.now() / 1000) + 120
const token = badToken ? `${exp}.${'0'.repeat(64)}` : `${exp}.${createHmac('sha256', SECRET).update(`${callId}.${exp}`).digest('hex')}`
const headers = {}
if (AUTH_TOKEN) headers['x-twilio-signature'] = createHmac('sha1', AUTH_TOKEN).update(url.replace(/^ws:/, 'wss:')).digest('base64')
const streamSid = 'MZ' + 'f'.repeat(32)
const callSid = 'CA' + 'a'.repeat(32)

const ws = new WebSocket(url, { headers })
let sent = 0
ws.on('open', () => {
  console.log(`fake-twilio: connected to ${url}, streaming ${(audio.inbound.length / 8000).toFixed(1)} s for call ${callId}${badToken ? ' with a BAD token' : ''}`)
  ws.send(JSON.stringify({ event: 'connected', protocol: 'Call', version: '1.0.0' }))
  ws.send(
    JSON.stringify({
      event: 'start',
      sequenceNumber: '1',
      start: { streamSid, accountSid: 'AC' + '1'.repeat(32), callSid, tracks: ['inbound', 'outbound'], customParameters: { token, callId, roles: 'rep,client' }, mediaFormat: { encoding: 'audio/x-mulaw', sampleRate: 8000, channels: 1 } },
      streamSid,
    }),
  )
  let seq = 2
  let chunk = 0
  const total = Math.floor(audio.inbound.length / 160)
  const timer = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return clearInterval(timer)
    for (const track of ['inbound', 'outbound']) {
      const pcm = audio[track].subarray(chunk * 160, chunk * 160 + 160)
      const payload = Buffer.from(Array.from(pcm, ulaw)).toString('base64')
      ws.send(JSON.stringify({ event: 'media', sequenceNumber: String(seq++), media: { track, chunk: String(chunk + 1), timestamp: String(chunk * 20), payload }, streamSid }))
      sent++
    }
    chunk++
    if (chunk >= total) {
      clearInterval(timer)
      ws.send(JSON.stringify({ event: 'stop', sequenceNumber: String(seq++), stop: { accountSid: 'AC' + '1'.repeat(32), callSid }, streamSid }))
      setTimeout(() => ws.close(1000, 'done'), 300)
    }
  }, 20)
})
ws.on('close', (code, reason) => {
  console.log(`fake-twilio: socket closed ${code} ${reason.toString()} after ${sent} media frames`)
  process.exit(badToken ? (code === 1008 ? 0 : 1) : code === 1000 ? 0 : 1)
})
ws.on('unexpected-response', (_req, res) => {
  console.log(`fake-twilio: handshake refused with HTTP ${res.statusCode}`)
  process.exit(1)
})
ws.on('error', (e) => {
  console.error('fake-twilio: error', e.message)
  process.exit(1)
})
