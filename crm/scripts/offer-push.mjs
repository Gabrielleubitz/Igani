// `npm run offer:push -- <slug>`: what "push" means in the studio.
//  1. typecheck (a broken offer never ships)
//  2. commit only this offer's files (offers/<slug>/, its images, the registry line)
//  3. pull --rebase, push → Vercel deploys
//  4. wait until the live CRM serves the new content, then set the offer LIVE (drafts only; signed offers stay signed)
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CRM = join(dirname(fileURLToPath(import.meta.url)), '..')
try {
  process.loadEnvFile(join(CRM, '.env.local'))
} catch {}

const slug = process.argv[2] ?? process.env.OFFER_SLUG
const fail = (msg) => {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}
if (!slug || !/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) fail('Usage: npm run offer:push -- <slug>')
if (!existsSync(join(CRM, 'offers', slug, 'content.tsx'))) fail(`offers/${slug}/content.tsx doesn't exist.`)
if (!new RegExp(`^\\s+'?${slug}'?: \\(\\)`, 'm').test(readFileSync(join(CRM, 'offers', 'registry.ts'), 'utf8'))) fail(`"${slug}" is missing from offers/registry.ts.`)

const git = (...args) => execFileSync('git', args, { cwd: CRM, encoding: 'utf8' }).trim()
const step = (s) => console.log(`\n→ ${s}`)

step('Typechecking')
if (spawnSync('npx', ['tsc', '--noEmit'], { cwd: CRM, stdio: 'inherit' }).status !== 0) fail('Typecheck failed. Fix the errors above, then push again.')

step('Committing this offer only')
const paths = [`offers/${slug}`, 'offers/registry.ts', ...(existsSync(join(CRM, 'public', 'offers', slug)) && readdirSync(join(CRM, 'public', 'offers', slug)).length ? [`public/offers/${slug}`] : [])]
git('add', '--', ...paths)
const staged = git('diff', '--cached', '--name-only', '--', ...paths)
if (staged) {
  git('commit', '-m', `Offer ${slug}: content and mockups`, '--', ...paths)
  console.log(staged.split('\n').map((f) => `   ${f}`).join('\n'))
} else console.log('   nothing new to commit')

step('Pushing to GitHub (Vercel deploys from main)')
const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
if (branch !== 'main') console.log(`   note: you're on "${branch}", not main; Vercel only deploys production from main.`)
try {
  execFileSync('git', ['pull', '--rebase', '--autostash'], { cwd: CRM, stdio: 'inherit' })
  execFileSync('git', ['push'], { cwd: CRM, stdio: 'inherit' })
} catch {
  fail('git pull/push failed (see above). Nothing was published.')
}

const remote = process.env.OFFER_STUDIO_REMOTE?.replace(/\/$/, '')
const token = process.env.OFFER_STUDIO_TOKEN
if (!remote || !token) {
  console.log('\n✓ Pushed. OFFER_STUDIO_REMOTE / OFFER_STUDIO_TOKEN are not set in crm/.env.local, so publish it from the CRM (Offers → Publish).\n')
  process.exit(0)
}
const api = `${remote}/api/studio/offers/${slug}`
const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' }

step('Waiting for Vercel to deploy it (up to 10 minutes)')
const started = Date.now()
let ready = false
while (Date.now() - started < 10 * 60_000) {
  try {
    const r = await fetch(api, { headers })
    if (r.status === 404) fail(`The live CRM has no offer "${slug}". Create it in ${remote}/admin/offers first.`)
    if (r.ok && (await r.json()).contentReady) {
      ready = true
      break
    }
  } catch {}
  process.stdout.write('.')
  await new Promise((res) => setTimeout(res, 15_000))
}
if (!ready) fail('The deploy did not show up within 10 minutes. Check Vercel, then run this again.')

step('Publishing')
const pub = await fetch(api, { method: 'POST', headers, body: JSON.stringify({ action: 'publish' }) })
const out = await pub.json().catch(() => ({}))
if (!pub.ok) fail(`Publishing failed (${pub.status}).`)
const root = process.env.OFFER_ROOT_DOMAIN ?? 'app.igani.co'
console.log(`\n✓ ${out.note ?? 'Live'}: https://${slug}.${root}  (also ${remote}/o/${slug})\n`)
