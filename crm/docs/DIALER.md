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
- [x] Admin → Phone: Twilio setup checklist, assign a number to each teammate, recording + consent message, recent calls.
- [x] Demo mode (development only): the whole dialer works without Twilio, so UI and logging are testable.

Twilio setup (one time, by the admin): see "Setup" below.

## Step 2 — Inbound calls

- [ ] Incoming calls ring in the browser of the line's owner (the token already allows incoming).
- [ ] Ringing UI (accept / decline), caller matched to a lead by phone number, unknown callers can be added as a lead.
- [ ] Missed call → task "Call back <name>" + voicemail (Twilio `<Record>`), voicemail shown on the lead.
- [ ] Busy / offline → voicemail; optional forwarding to the user's mobile.

## Step 3 — Recordings into CallMap

- [ ] Recording callback → store the recording privately (Cloudinary raw/private like contracts, or keep on Twilio
      and stream through an authenticated CRM route). Never a public URL.
- [ ] Send each recording to the CallMap engine (it already ingests phone recordings: download → Whisper transcript →
      analysis; see `callmap/Documentation/NET2PHONE_CALLMAP_TECHNICAL_INTEGRATION.md`). `Call.analysisStatus` tracks it.
- [ ] Transcript + summary + action items on the call, shown on the lead; action items can become tasks (like meetings).

## Step 4 — Coaching

- [ ] Per-call coaching card from CallMap: talk/listen ratio, questions asked, objections and how they were handled,
      next step agreed, score with 2–3 concrete tips.
- [ ] Salesperson sees their own coaching after each call (in the wrap-up and on the call page).

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
   and answers with `<Dial callerId="their number">` (+ recording and status callbacks; consent message if set).
4. `/api/public/voice/status` follows the call (ringing, answered, completed) and logs "call ended" on the lead.
5. `/api/public/voice/recording` stores the recording reference (used from step 3).
6. Wrap-up in the dialer saves outcome + note on the call and the lead.
