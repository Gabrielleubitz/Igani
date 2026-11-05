# New igani.co site: what it changes

The new marketing site is plain HTML in `public/new-site/`, served at `/`, `/sales`, `/marketing`, `/ai`, `/build` by rewrites in `next.config.js`.
Everything else (`/salescrm`, `/what-we-build`, `/about`, `/faq`, `/privacy`, `/terms`, `/api/*`, offers, admin) is untouched.

## Brought back on the new pages
| Feature | How it works now |
|---|---|
| Contact form | Posts to `/api/leads` (Firestore, admin email, Google Sheet, CRM). Shows success only after a 2xx; shows a phone/email fallback on error. Honeypot and timing trap kept. |
| Hotjar | `<script src="/hotjar.js">` on every page. `app/hotjar.js/route.ts` reads `NEXT_PUBLIC_HOTJAR_ID` (same variable as before). Does nothing if the variable is unset. |
| Vercel Analytics | `/_vercel/insights/script.js` on every page (works on Vercel; 404 only on local dev). |
| Google Search Console | Same verification meta tag on every page. |
| Visitor tracker + heatmap (CRM Admin → Website) | `public/new-site/tracker.js` on the home page, built from `lib/site-tracker-core.ts` by `node scripts/build-tracker.mjs`. Same CRM endpoint, same `?team=1` and `?igani-heatmap=1` behaviour. Re-run the build script if the core changes. |
| Section names in the heatmap | `crm/lib/site-pages.ts` now names the new section ids (hero, clients, problem, services, inside, approach, team, contact). Deploy the CRM to see the names. |
| Structured data (JSON-LD) | Static Organization + WebSite data on the home page (name, logo, phones, founders, social links). |
| Favicons, manifest, link preview (og/twitter) | On every page. Image: `/og/default.jpg`. |
| Canonical URLs | One per page. |
| Privacy and Terms links | In every footer. |
| Sitemap | `/sales`, `/marketing`, `/ai`, `/build` added. |
| `llms.txt` | Rewritten for the new pages and positioning. |
| Old URLs | `/sales.html`, `/ai.html`, `/marketing.html`, `/build.html`, `/index.html` redirect to the clean paths. `/#contact` still works, so `/contact` and `/start` redirects are fine. |

## Affected, not carried over (decide)
- **Promo banner** (Admin → Banner, shown on the old home page): not on the new pages.
- **Admin-managed site settings** (meta title/description, phone numbers, WhatsApp, social links in Admin → Settings): the new pages have these hard-coded. Edits in admin no longer change the new pages.
- **Backend-admin "Messages"**: the old home form saved to Messages via `/api/contact`; the new form goes to Leads via `/api/leads`. New enquiries appear under Leads (and in the CRM), not Messages.
- **Hebrew**: the old site had a Hebrew toggle; the new site is English only. TODO: add Hebrew.
- **Other pages** (`/about`, `/faq`, team profiles, `/privacy`, `/terms`, `/salescrm`, `/what-we-build`) keep their own look, so they will not match the new site's design until restyled.
- **Old in-page links** such as `/#work` or `/#process` (ads, emails, old posts) no longer have a target on the new home; the page opens at the top. The new sections are `#problem`, `#services`, `#inside`, `#approach`, `#team`, `#contact`.
- **Old home page code** (`app/page.tsx`, `NewHome`) is still in the repo but not served. To go back: delete the `rewrites()` block in `next.config.js`.
- **Heatmap history**: past visits recorded old section ids; they show under their old names beside the new ones.
- **Unverified here**: Hotjar and Vercel Analytics need production to confirm (no ID or Vercel in the test environment).

## Reminders
- Add Hebrew to the new site (owner asked to be reminded from now on).
