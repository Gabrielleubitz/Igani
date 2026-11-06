// Builds public/new-site/cube.js: the hero Rubik's cube for the static home page, from lib/hero-cube-core.ts (+ three).
// Run with: node scripts/build-cube.mjs   (uses the esbuild that ships with the CRM's dependencies)
import { createRequire } from 'node:module'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const require = createRequire(new URL('../crm/package.json', import.meta.url))
const esbuild = require('esbuild')
const dir = mkdtempSync(join(tmpdir(), 'cube-'))
const entry = join(dir, 'entry.ts')
writeFileSync(
  entry,
  `import { mountHeroCube } from ${JSON.stringify(new URL('../lib/hero-cube-core.ts', import.meta.url).pathname)}\nconst host = document.querySelector('[data-cube]')\nif (host) mountHeroCube(host as HTMLElement)\n`,
)
await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  outfile: new URL('../public/new-site/cube.js', import.meta.url).pathname,
  nodePaths: [new URL('../node_modules', import.meta.url).pathname],
  logLevel: 'warning',
})
console.log('built public/new-site/cube.js')
