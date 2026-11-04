# CRM dialer (Twilio) + CallMap coaching — plan

Goal: every salesperson calls from inside the CRM with their own Twilio number. Calls are logged on the lead,
recorded, analysed by the CallMap engine (transcript, coaching), and admins get recordings, insights and
performance reviews.

We build it in steps. Each step ships on its own, is tested, and leaves the next step a clean place to start.

## Step 1 — Foundation: outbound calling (this step)

- [x] Data model: `PhoneLine` (one Twilio number per user) and `Call` (every call, its legs, timing, recording, outcome).
- [x] Twilio server pieces: access token for the browser, TwiML voice webhook, call status + recording callbacks.
      Every Twilio webhook is signature-checked. The voice webhook only dials for a call row the signed-in user created
      a moment ago, from their own line, to an allowed country.
- [x] Number rules: normalise to E.164 (Israeli `05x…` and US numbers), block premium / short / unknown-country numbers.
- [x] Floating dialer (bottom-right, every page): keypad, contact search, recent calls, in-call screen
      (timer, mute, keypad tones, hang up), and a wrap-up after the call (outcome + note, saved on the lead).
- [x] Click-to-call: the lead page "Call" button and phone numbers open the dialer instead of `tel:`.
- [x] Calls on the lead's timeline (call ended + duration, outcome + note).
- [x] Admin → Phone: Twilio setup checklist, assign a number to each teammate, recording on/off, allowed countries, recent calls.
- [x] Demo mode (development only): the whole dialer works without Twilio, so UI and logging are testable.

Twilio setup (one time, by the admin): see "Setup" below.

## Step 2 — Inbound calls ✅

- [x] Calls to a number ring in every CRM tab of the person it's assigned to (Igani ringtone, desktop notification
      when the tab isn't in front, flashing tab title); caller matched to their contacts by phone number.
- [x] Accept → same in-call screen, wrap-up, recording, transcript and coaching as outgoing calls.
- [x] Declined, unanswered after 25 s, or already on a call → voicemail (2 min) and a "Call back …" task (once).
- [x] Admin → Phone → Incoming calls: "Ring in the CRM" per number (its previous routing is saved; Undo restores it).
- [ ] Forward to the person's mobile when they're offline.

## Step 3 — Recordings and transcripts ✅

- [x] Recordings stay on Twilio; the CRM streams them through `/api/calls/[id]/recording` (the caller and admins only,
      byte ranges for seeking). A missed recording callback is healed by looking the recording up on the call's legs.
- [x] Each recording (15 s to ~45 min) is transcribed with Whisper (timestamps) right after Twilio's recording callback
      (`after()`), retried by the hourly job (3 attempts). Audio goes to OpenAI for this only.
- [x] Summary, outcome, next step, needs and action items on the call page; a "Call summary" entry on the lead.

## Step 4 — Coaching ✅ (CallMap-style, built in: `lib/call-analysis.ts`)

- [x] Per call: score 0–100, rubric (opening, discovery, value, objections, next step), talk/listen ratio, questions
      asked, objections and whether they were handled, strengths, things to work on, and coaching moments (what the
      client said, what the rep said, a better line, why) with a jump to that moment in the recording.
- [x] Calls page: salespeople see their own numbers and calls; admins see the team table (calls, connect rate, talk
      time, average score, 7-day trend) and every call.
- [ ] Turn action items into tasks with one click.

## Step 5 — Admin insights and performance reviews

- [ ] Admin → Calls: every call, filter by person / outcome / date, play recordings, read transcripts.
- [ ] Per-person dashboard: calls/day, connect rate, talk time, average score, trends.
- [ ] Monthly performance review per salesperson generated from their calls and coaching, editable by the admin.

## Setup (Twilio, one time)

1. Twilio console → buy (or port) one number per salesperson. Give the account Voice geo-permissions for the
   countries you call (Israel, US).
2. Create an **API key** (Account → API keys): you get `TWILIO_API_KEY_SID` + `TWILIO_API_KEY_SECRET`.
3. Create a **TwiML App** (Voice → TwiML apps): Voice request URL = `https://app.igani.co/api/public/voice/twiml` (POST).
   Its SID is `TWILIO_TWIML_APP_SID`.
4. Vercel → CRM project → environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (used to verify Twilio's
   webhooks), `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`, `TWILIO_TWIML_APP_SID`. Redeploy.
5. CRM → Admin → Phone: the checklist turns green; assign each number to its teammate.

## How a call flows (outbound)

1. Dialer → server action `startCall(to, leadId?)`: checks the user's line, normalises and validates the number, creates
   a `Call` row (INITIATED) and returns its id.
2. Browser (Twilio Voice SDK) connects with `{ callId }`. Twilio asks `/api/public/voice/twiml`.
3. The webhook verifies Twilio's signature, loads the call (must belong to the token's user, be INITIATED and fresh),
   and answers with `<Dial callerId="their number">` (+ recording and status callbacks).
4. `/api/public/voice/status` follows the call (ringing, answered, completed) and logs "call ended" on the lead.
5. `/api/public/voice/recording` stores the recording reference (used from step 3).
6. Wrap-up in the dialer saves outcome + note on the call and the lead.
