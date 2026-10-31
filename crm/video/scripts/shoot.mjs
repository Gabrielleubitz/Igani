import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs'
const out = new URL('../public/shots/', import.meta.url).pathname
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:3100/login?callbackUrl=/sales/today'); await p.waitForLoadState('networkidle'); await p.fill('input[aria-label="Dev login email"]', 'gabrielleubitz@igani.co'); await p.click('text=Dev sign in'); await p.waitForURL((u) => !u.pathname.includes('login'), { timeout: 30000 })
const pages = { today: '/sales/today', contacts: '/sales/leads', board: '/sales/board', tasks: '/sales/tasks', reports: '/sales/reports', pipeline: '/sales', invite: '/sales/invite', hours: '/sales/availability', overview: '/admin/dashboard', bookings: '/admin/bookings', bookingpages: '/admin/booking-pages', team: '/admin/users', audit: '/admin/audit', settings: '/admin/settings', import: '/sales/import', marketing: '/marketing', lead: '/sales/leads/demo4', book: '/book/intro' }
for (const [k, u] of Object.entries(pages)) { await p.goto('http://localhost:3100' + u, { waitUntil: 'networkidle', timeout: 60000 }); await p.screenshot({ path: out + k + '.png' }); console.log(k) }
await b.close()
