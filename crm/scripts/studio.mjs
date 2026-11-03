// `npm run studio`: the CRM on localhost:3100 plus the local terminal bridge Claude runs in.
// Open http://localhost:3100/admin/offers, pick an offer, and press "Open studio".
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CRM = join(dirname(fileURLToPath(import.meta.url)), '..')
const STUDIO = join(CRM, 'studio')

if (!existsSync(join(STUDIO, 'node_modules', 'node-pty'))) {
  console.log('[studio] installing the terminal bridge (first run only)…')
  const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: STUDIO, stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

// Already running? Then don't start a second CRM and bridge next to it.
const busy = spawnSync('lsof', ['-ti', 'tcp:3100', '-sTCP:LISTEN'], { encoding: 'utf8' }).stdout.trim()
if (busy) {
  console.error('\n[studio] Something is already running on port 3100 (probably the studio). Open http://localhost:3100/admin/offers, or stop it first.\n')
  process.exit(1)
}

const children = [
  spawn('node', ['server.mjs'], { cwd: STUDIO, stdio: 'inherit' }),
  // Dev login on: Google sign-in needs an OAuth client set up for localhost, the dev login doesn't (it never works in production)
  spawn('npx', ['next', 'dev', '-p', '3100'], { cwd: CRM, stdio: 'inherit', env: { ...process.env, DEV_LOGIN: process.env.DEV_LOGIN ?? '1' } }),
]
console.log('\n[studio] CRM:     http://localhost:3100/admin/offers  (sign in with "Dev login" and your email)\n[studio] Offers:  http://<slug>.localhost:3100\n')

const stop = () => {
  for (const c of children) c.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const c of children) c.on('exit', (code) => (code ? stop() : undefined))
