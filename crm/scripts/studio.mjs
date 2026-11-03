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

const children = [
  spawn('node', ['server.mjs'], { cwd: STUDIO, stdio: 'inherit' }),
  spawn('npx', ['next', 'dev', '-p', '3100'], { cwd: CRM, stdio: 'inherit' }),
]
console.log('\n[studio] CRM:     http://localhost:3100/admin/offers\n[studio] Offers:  http://<slug>.localhost:3100\n')

const stop = () => {
  for (const c of children) c.kill('SIGTERM')
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
for (const c of children) c.on('exit', (code) => (code ? stop() : undefined))
