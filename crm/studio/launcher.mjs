// Igani studio helper. LOCAL ONLY, always on (installed as a macOS LaunchAgent by `npm run studio:install`).
//
// The studio page lives in the live CRM (https://app.igani.co/admin/offers/studio/<slug>). It talks to this helper on
// 127.0.0.1:3198 to:
//   - start the studio on demand (the terminal bridge + a local Next server that renders the offer preview)
//   - prepare an offer (copy it from the live CRM, create its files, refresh offer-data.json / assets.json)
//   - get the terminal key, so the page can open Claude's terminal
//   - upload / remove the client's logo and images (saved in public/offers/<slug>/)
// Only pages from the CRM's own origins may call it (checked on every request), so other websites can't use it.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { connect } from 'node:net'
import { homedir } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const CRM = join(HERE, '..')
const PORT = Number(process.env.STUDIO_LAUNCHER_PORT ?? 3198)
const APP = 'http://127.0.0.1:3100'
const LOG = join(homedir(), 'Library', 'Logs', 'igani-studio.log')
const ORIGINS = new Set(['https://app.igani.co', 'http://localhost:3100', 'http://127.0.0.1:3100', ...(process.env.STUDIO_ORIGINS ?? '').split(',').filter(Boolean)])
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/
const TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/gif': '.gif' }
const MAX = 8 * 1024 * 1024

let child = null
let starting = null

const portOpen = (port) =>
  new Promise((resolve) => {
    const s = connect(port, '127.0.0.1')
    s.once('connect', () => (s.destroy(), resolve(true)))
    s.once('error', () => resolve(false))
  })
const appUp = () =>
  fetch(`${APP}/login`, { signal: AbortSignal.timeout(4000) })
    .then(() => true)
    .catch(() => false)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const token = () => {
  try {
    return readFileSync(join(HERE, '.token'), 'utf8').trim() || null
  } catch {
    return null
  }
}

/** Starts the studio (bridge + local Next) unless it is already running; resolves once both answer. */
async function ensureStudio() {
  if ((await portOpen(3199)) && (await appUp()) && token()) return
  if (starting) return starting
  starting = (async () => {
    if (!(await portOpen(3100)) && !(await portOpen(3199))) {
      mkdirSync(dirname(LOG), { recursive: true })
      const out = openSync(LOG, 'a')
      child = spawn(process.execPath, [join(CRM, 'scripts', 'studio.mjs')], { cwd: CRM, stdio: ['ignore', out, out], env: { ...process.env, STUDIO_FROM_LAUNCHER: '1' } })
      child.on('exit', () => (child = null))
    }
    for (let i = 0; i < 120; i++) {
      if ((await portOpen(3199)) && (await appUp()) && token()) return
      await sleep(1000)
    }
    throw new Error(`The studio did not start within 2 minutes. See ${LOG}`)
  })()
  try {
    await starting
  } finally {
    starting = null
  }
}

/** Copy the offer from the live CRM, create its files, refresh offer-data.json and assets.json (runs in the local Next). */
async function prepare(slug, pull = true) {
  const res = await fetch(`${APP}/api/studio/local/${slug}${pull ? '' : '?pull=0'}`, { method: 'POST', headers: { 'x-studio-token': token() ?? '' }, signal: AbortSignal.timeout(90_000) })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `Preparing the offer failed (${res.status})`)
}

function listAssets(slug) {
  const dir = join(CRM, 'public', 'offers', slug)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((n) => Object.values(TYPES).includes(extname(n).toLowerCase()))
    .map((n) => ({ name: n, path: `/offers/${slug}/${n}`, size: statSync(join(dir, n)).size, logo: /^logo\./i.test(n) }))
    .sort((a, b) => Number(b.logo) - Number(a.logo) || a.name.localeCompare(b.name))
}

function saveAsset(slug, kind, fileName, type, buf) {
  const ext = TYPES[type]
  if (!ext) throw new Error(`${fileName}: use PNG, JPG, WebP, SVG or GIF.`)
  if (buf.length > MAX) throw new Error(`${fileName} is over 8 MB.`)
  const dir = join(CRM, 'public', 'offers', slug)
  mkdirSync(dir, { recursive: true })
  let name
  if (kind === 'logo') {
    for (const old of readdirSync(dir).filter((n) => /^logo\./i.test(n))) rmSync(join(dir, old))
    name = `logo${ext}`
  } else {
    const base = fileName.replace(/\.[^.]+$/, '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'image'
    name = `${base}${ext}`
    for (let n = 2; existsSync(join(dir, name)); n++) name = `${base}-${n}${ext}`
  }
  writeFileSync(join(dir, name), buf)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > MAX + 1024) {
        reject(new Error('File too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin ?? ''
  const allowed = ORIGINS.has(origin)
  const send = (status, body) => {
    res.writeHead(status, {
      'content-type': 'application/json',
      ...(allowed ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
    })
    res.end(JSON.stringify(body))
  }
  if (req.method === 'OPTIONS') {
    if (!allowed) return send(403, { error: 'Not allowed' })
    res.writeHead(204, {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type, x-file-name, x-kind',
      // Chrome: a public page (app.igani.co) asking a local address must be explicitly allowed
      'access-control-allow-private-network': 'true',
      'access-control-max-age': '600',
      vary: 'Origin',
    })
    return res.end()
  }
  if (!allowed) return send(403, { error: 'Not allowed' })

  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  try {
    if (req.method === 'GET' && url.pathname === '/status') {
      return send(200, { ok: true, running: (await portOpen(3199)) && (await appUp()) })
    }
    // Start the studio if needed, prepare the offer, hand back what the page needs
    if (req.method === 'POST' && url.pathname === '/session') {
      const { slug } = JSON.parse((await readBody(req)).toString() || '{}')
      if (!SLUG_RE.test(slug ?? '')) return send(400, { error: 'Bad offer address' })
      await ensureStudio()
      await prepare(slug)
      return send(200, { token: token(), bridge: 'ws://127.0.0.1:3199', preview: `http://${slug}.localhost:3100` })
    }
    const m = url.pathname.match(/^\/assets\/([a-z0-9-]+)$/)
    if (m && SLUG_RE.test(m[1])) {
      const slug = m[1]
      if (req.method === 'GET') return send(200, { assets: listAssets(slug) })
      if (req.method === 'POST') {
        const buf = await readBody(req)
        saveAsset(slug, req.headers['x-kind'] === 'logo' ? 'logo' : 'image', decodeURIComponent(String(req.headers['x-file-name'] ?? 'image')), String(req.headers['content-type'] ?? ''), buf)
        await prepare(slug, false).catch(() => undefined) // assets.json + offer-data.json
        return send(200, { assets: listAssets(slug) })
      }
      if (req.method === 'DELETE') {
        const name = url.searchParams.get('name') ?? ''
        if (!/^[a-z0-9-]+\.(png|jpg|webp|svg|gif)$/i.test(name)) return send(400, { error: 'Bad file name' })
        rmSync(join(CRM, 'public', 'offers', slug, name), { force: true })
        await prepare(slug, false).catch(() => undefined)
        return send(200, { assets: listAssets(slug) })
      }
    }
    return send(404, { error: 'Not found' })
  } catch (err) {
    return send(500, { error: err instanceof Error ? err.message : String(err) })
  }
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[studio-helper] already running on ${PORT}`)
    process.exit(0)
  }
  throw err
})
server.listen(PORT, '127.0.0.1', () => console.log(`[studio-helper] listening on http://127.0.0.1:${PORT}`))
