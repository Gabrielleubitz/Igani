// Dev helper: renders every CRM email with sample data to HTML files for visual review.
// Usage: npx tsx scripts/render-emails.tsx <outDir>
import { render } from '@react-email/render'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import * as React from 'react'
import { SAMPLES } from '../emails/samples'

const out = process.argv[2] ?? 'email-previews'
mkdirSync(out, { recursive: true })
void (async () => {
for (const [name, el] of Object.entries(SAMPLES)) {
  writeFileSync(join(out, `${name}.html`), await render(el as React.ReactElement))
  console.log('wrote', name)
}
})()
