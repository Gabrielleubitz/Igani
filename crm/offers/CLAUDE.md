# Offer studio: instructions for Claude

You are running inside the Igani CRM's **offer studio**. Your working directory is `crm/offers/<slug>/` (also in `$OFFER_SLUG`).
An Igani admin is talking to you to build a **client offer**: a proposal microsite at `https://<slug>.app.igani.co`.
They see your terminal on the left and a live preview of the offer (`http://<slug>.localhost:3100`) on the right, which updates as you save files.

## What you write, and what you don't

| Part | Where | Who |
|---|---|---|
| Text (Hebrew + English), mockup screens, screenshots | `offers/<slug>/content.tsx`, `offers/<slug>/screens.tsx`, images in `crm/public/offers/<slug>/` | **You** |
| Modules, prices, monthly fee, timeline, contract PDF, the lead | The CRM (Admin → Offers) | The admin. **Never invent or change prices.** |

`offer-data.json` in this folder is a read-only snapshot of the CRM numbers and the client (plus recent CRM notes). Read it first.
Module `id`s there are the keys for `content.modules`. If a module is missing or a price looks wrong, tell the admin to change it in the CRM and reopen the studio.

## The files

- `offers/types.ts`: the `OfferContent` type. Every text field is `{ he, en }`. Read it before writing.
- `offers/cryo/`: a complete example (content, phone + desktop flows, gallery, architecture). Copy its structure and tone.
- `content.tsx`: default export `OfferDefinition` = `{ content, screens }`.
- `screens.tsx`: `export const screens = { key: Component }`. Each screen is a React component `({ lang }) => JSX`,
  rendered inside a 300 px-wide phone frame (560 px tall, scrolls) or a 16:10 desktop frame. Use Tailwind classes.
  Screens are **mockups**: static, realistic data, no fetching, no state unless a tiny `'use client'` interaction really helps.
  Use `next/image` with files from `/offers/<slug>/...` for photos and logos.
- `flows[].steps[].screen` must match a key in `screens`.

## Build screens from blocks (lego bricks)

`offers/blocks/` is the shared component library (also browsable at http://localhost:3100/admin/offers/blocks).
`offers/blocks/catalog.tsx` lists every block with its id, what it is for, which frame it fits (page / phone / desktop) and a
working sample: **read it before writing a screen**.

- Compose screens from blocks: `import { AppScreen, ItemList } from '../blocks/app'`, `'../blocks/dashboard'`, `'../blocks/marketing'`,
  `'../blocks/base'` (Icon, Pill, Avatar, Picture, AccentButton). Wrap phone screens in `AppScreen`, admin screens in `DashboardShell`.
- Change things through **props** (text, images, items, icons, tone). **Never edit files in `offers/blocks/`** to fit one offer:
  every other offer uses them too. If a block can't do what's needed, write a small local component in `screens.tsx` next to it.
- When the admin names blocks ("use HeroSplit and PricingTiers"), use exactly those ids.
- Colours come from the offer accent (`client.accent` in content.tsx); don't hard-code brand colours in screens.
- Small requests ("make the button say Book now", "add a third testimonial") are prop changes. Keep them small.
- The agreed screens are exported later (Admin → offer → Export UI) as the starting point for the real build, so keep them clean.

## What every offer must show (like https://shilan-trade.pancake.solutions)

- **At least two flows of mockup screens**, built from blocks:
  1. the **customer side** (phone app or website): the main thing the client's customers do, start to finish (4–6 screens);
  2. the **back office** (desktop, `DashboardShell`): what the client's team sees and manages (2–4 screens).
  Add a third flow when the project has another user type (drivers, partners, restaurants...).
- Realistic data in the client's language and market (names, prices, places), never lorem ipsum.
- **Client logo and images**: `offer-data.json` → `logo` and `images` (uploaded by the admin in the studio). Use `logo` as
  `content.client.logo` and in the mockups (headers, sign-in screens, `DashboardShell logo`). Use `images` for photos,
  `gallery`, `DetailHero`, product grids. If there is no logo yet, use the client name as text and say so.
- **Recurring payments**: modules in `offer-data.json` can have `period: "month" | "year"` (hosting, maintenance, licences).
  The page prices them automatically; mention what the recurring payment covers in that module's copy.

## Writing style

- Hebrew is the default for Israeli clients (`defaultLang: 'he'`), English for others. Always fill **both** languages.
- Write like a senior product studio: concrete, short sentences, the client's own terms, no hype words ("revolutionary", "seamless", "cutting-edge").
- No em dashes. Use commas, colons, or full stops.
- `hero.title` says what the system does for them in one line. `hero.summary` is 2–3 sentences.
- `need.points` / `solution.points`: 3–5 each. `phases` should add up to the CRM timeline. `decisions` are real open questions.

## Screenshots and images

- Client assets (logo, photos) go in `crm/public/offers/<slug>/` and are referenced as `/offers/<slug>/file.webp`.
- To capture a screenshot of a live site, use the `playwright-cli` skill (or `npx playwright screenshot <url> crm/public/offers/<slug>/name.png`). Keep images under ~300 KB (prefer `.webp`).

## Check your work

- `npx tsc --noEmit` in `crm/` (two folders up: `$OFFER_CRM_DIR`) must pass.
- Look at the preview in **both** languages (the admin can toggle it) and both devices. Hebrew pages are right-to-left.

## "Push" / "publish" / "ship it"

When the admin says push, run from `crm/`:

```bash
npm run offer:push -- <slug>
```

It typechecks, commits **only this offer's files**, pushes to GitHub (Vercel deploys), waits for the deploy, and sets the offer live.
Report the live URL it prints. Never push other files, never force-push, and don't run it unless the admin asked.
If it fails, explain the error in plain words and fix what you can.
