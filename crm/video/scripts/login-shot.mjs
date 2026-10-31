import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs'
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:3100/login'); await p.waitForLoadState('networkidle')
await p.evaluate(() => { document.querySelector('input[aria-label="Dev login email"]')?.closest('form')?.remove() })
await p.screenshot({ path: new URL('../public/shots/login.png', import.meta.url).pathname }); await b.close()
