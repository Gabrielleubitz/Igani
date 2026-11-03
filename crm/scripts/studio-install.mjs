// `npm run studio:install`: installs the studio helper as a macOS LaunchAgent (starts at login, restarts if it stops).
// The helper only listens on 127.0.0.1:3198 and starts the studio when the CRM's studio page asks for it.
// `npm run studio:uninstall` removes it.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, userInfo } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CRM = join(dirname(fileURLToPath(import.meta.url)), '..')
const LABEL = 'co.igani.studio'
const PLIST = join(homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`)
const LOG = join(homedir(), 'Library', 'Logs', 'igani-studio.log')
const domain = `gui/${userInfo().uid}`
const uninstall = process.argv.includes('--uninstall')

if (process.platform !== 'darwin') {
  console.error('The studio helper is for macOS.')
  process.exit(1)
}

spawnSync('launchctl', ['bootout', `${domain}/${LABEL}`], { stdio: 'ignore' })
if (uninstall) {
  rmSync(PLIST, { force: true })
  console.log('✓ Studio helper removed.')
  process.exit(0)
}

// The terminal bridge needs its own packages (first run only)
if (!existsSync(join(CRM, 'studio', 'node_modules', 'node-pty'))) {
  console.log('→ Installing the terminal bridge…')
  if (spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: join(CRM, 'studio'), stdio: 'inherit' }).status !== 0) process.exit(1)
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${esc(process.execPath)}</string>
    <string>${esc(join(CRM, 'studio', 'launcher.mjs'))}</string>
  </array>
  <key>WorkingDirectory</key><string>${esc(CRM)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>${esc(process.env.PATH ?? '/usr/bin:/bin')}</string>
    <key>SHELL</key><string>${esc(process.env.SHELL ?? '/bin/zsh')}</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${esc(LOG)}</string>
  <key>StandardErrorPath</key><string>${esc(LOG)}</string>
</dict>
</plist>
`
mkdirSync(dirname(PLIST), { recursive: true })
mkdirSync(dirname(LOG), { recursive: true })
writeFileSync(PLIST, plist)
execFileSync('launchctl', ['bootstrap', domain, PLIST])
console.log(`\n✓ Studio helper installed. It starts at login and waits on 127.0.0.1:3198.
  Open any offer in the CRM → Open studio. The studio starts by itself.
  Log: ${LOG}
  Remove it any time: npm run studio:uninstall\n`)
