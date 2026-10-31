import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs'
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:3100/login?callbackUrl=/sales/today'); await p.waitForLoadState('networkidle'); await p.fill('input[aria-label="Dev login email"]', 'gabrielleubitz@igani.co'); await p.click('text=Dev sign in'); await p.waitForURL((u) => !u.pathname.includes('login'))
const q = async (url, sel) => { await p.goto('http://localhost:3100' + url, { waitUntil: 'networkidle' }); const e = p.locator(sel).first(); console.log(url, sel, JSON.stringify(await e.boundingBox())) }
await q('/sales/today', 'text=Hottest leads >> xpath=ancestor::div[contains(@class,"rounded")][1]')
await q('/sales/leads', 'input[placeholder^="Search"]')
await q('/sales/leads', 'text=+ Add contact')
await q('/sales/leads/demo4', 'text=Log call')
await q('/sales/board', 'text=NEW >> xpath=ancestor::div[2]')
await b.close()
