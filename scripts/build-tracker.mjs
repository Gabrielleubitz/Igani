// Builds public/new-site/tracker.js: the visitor tracker / heatmap for the static home page, from lib/site-tracker-core.ts.
// Run with: node scripts/build-tracker.mjs   (uses the esbuild that ships with the CRM's dependencies)
import { createRequire } from 'node:module'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const require = createRequire(new URL('../crm/package.json', import.meta.url))
const esbuild = require('esbuild')
const dir = mkdtempSync(join(tmpdir(), 'tracker-'))
const entry = join(dir, 'entry.ts')
writeFileSync(entry, `import { startSiteTracker } from ${JSON.stringify(new URL('../lib/site-tracker-core.ts', import.meta.url).pathname)}\nstartSiteTracker('home')\n`)
await esbuild.build({ entryPoints: [entry], bundle: true, minify: true, format: 'iife', target: 'es2019', outfile: new URL('../public/new-site/tracker.js', import.meta.url).pathname })
console.log('built public/new-site/tracker.js')
