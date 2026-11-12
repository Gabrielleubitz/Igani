# Igani listen relay

A tiny Node 20 + `ws` service that lets admins listen to live sales calls from the CRM (Calls → Live now → Listen).

Calls are placed exactly as always. When an admin clicks Listen, the CRM asks Twilio to fork the call's audio (both sides, one way only) to this relay as a [Media Stream](https://www.twilio.com/docs/voice/media-streams). The relay keeps one room per call and forwards each 20 ms μ-law frame to the admins connected to that room as a small binary frame (`[track id][μ-law bytes]`; track 0 = the call's inbound side, 1 = outbound). The browser decodes and plays it (rep in the left ear, client in the right). When the last listener leaves, the relay tells the CRM, which stops the stream. Nothing is recorded or stored here, and nothing about the audio is logged. The rep and the client hear and see nothing of it; a stream failing can't touch the call.

Endpoints:

- `GET /healthz` – `ok rooms=<n>`
- `WS /twilio` – Twilio connects here. The `start` message must carry `customParameters.token` (`<expiry>.<hex HMAC-SHA256(callId.expiry)>` with `LISTEN_RELAY_SECRET`), `callId` and `roles`. A bad token closes the socket with code 1008. If `TWILIO_AUTH_TOKEN` is set, the handshake's `X-Twilio-Signature` is checked as well.
- `WS /listen?token=<jwt>` – an admin's browser. The token is an HS256 JWT `{ callId, sub, roles, exp }` signed with `LISTEN_RELAY_SECRET` by the CRM (`lib/listen.ts`), valid for two minutes to connect. Sends `{"type":"hello", roles, streaming}` first, then audio frames; `{"type":"stream"}` when the audio starts, `{"type":"ended"}` when the call is over.
- When a room's last listener leaves (3 s grace for reconnects), it POSTs `{ callId, at }` to `<CRM_URL>/api/public/listen/ended` with header `x-listen-signature` = hex HMAC-SHA256 of the raw body, and closes Twilio's socket.

Environment: `LISTEN_RELAY_SECRET` (required, 16+ chars, the same value as the CRM's), `TWILIO_AUTH_TOKEN` (recommended), `CRM_URL` (`https://app.igani.co`), `PORT` (8080).

## Deploy on Fly.io (once)

```sh
# 1. Fly account + CLI (https://fly.io/docs/flyctl/install/), then from this folder:
cd relay
fly auth login
fly launch --no-deploy --copy-config --name igani-listen --region fra   # keeps fly.toml as is; say no to Postgres/Redis

# 2. Secrets: a long random secret shared with the CRM, the Twilio auth token (Twilio Console → Account info), the CRM URL
openssl rand -hex 32          # → use the output as LISTEN_RELAY_SECRET below and in Vercel
fly secrets set LISTEN_RELAY_SECRET=<that value> TWILIO_AUTH_TOKEN=<twilio auth token> CRM_URL=https://app.igani.co

# 3. Deploy (one shared-cpu-1x / 256 MB machine in fra, never auto-stopped)
fly deploy
curl https://igani-listen.fly.dev/healthz        # → ok rooms=0

# 4. Custom domain: listen.igani.co
fly certs add listen.igani.co
# then at the DNS provider for igani.co add the records `fly certs show listen.igani.co` lists:
#   CNAME  listen  →  igani-listen.fly.dev        (or the A/AAAA records it shows)
#   plus the _acme-challenge CNAME it asks for, if any
fly certs check listen.igani.co                  # until it says the certificate is issued
curl https://listen.igani.co/healthz
```

## Wire the CRM to it (Vercel → Project → Settings → Environment Variables, Production)

- `LISTEN_RELAY_URL` = `wss://listen.igani.co`
- `LISTEN_RELAY_SECRET` = the same value as the relay's

Redeploy the CRM. Admin → Phone → "Admins may listen in on live calls" must be on; the Listen button then appears on connected calls in Calls → Live now. Until both variables are set, the button stays hidden and Admin → Phone says why.

Twilio needs nothing configured: the CRM creates each stream through the REST API when an admin clicks Listen. Twilio's own geo/feature permissions don't apply to Media Streams; the stream costs a fraction of a cent per minute while someone is listening.

## Test locally

```sh
cd relay && npm install
LISTEN_RELAY_SECRET=dev-secret-dev-secret-dev node server.mjs &
# a listener joins the room (waits up to 10 s for audio) …
LISTEN_RELAY_SECRET=dev-secret-dev-secret-dev node test/listen-client.mjs ws://localhost:8080 cltestcall00000000000001 10 &
# … then "Twilio" streams 3 s of a two-tone test signal (or --wav some.wav)
LISTEN_RELAY_SECRET=dev-secret-dev-secret-dev node test/fake-twilio.mjs ws://localhost:8080/twilio cltestcall00000000000001 3
# auth: both of these must be refused
LISTEN_RELAY_SECRET=dev-secret-dev-secret-dev node test/listen-client.mjs ws://localhost:8080 cltestcall00000000000001 3 --bad-token
LISTEN_RELAY_SECRET=dev-secret-dev-secret-dev node test/fake-twilio.mjs ws://localhost:8080/twilio cltestcall00000000000001 1 --bad-token
```

The listener prints the frames and signal level per track and exits 0 when audio flowed on both.

## First real test, cheaply

1. Buy (or reuse) a second Twilio number and point its voice URL at a TwiML Bin that plays a looping MP3: `<Response><Play loop="0">https://…/some-talk.mp3</Play></Response>`.
2. Have a salesperson (or a second account) call that number from the CRM dialer; on the Calls page, as an admin, click Listen on it in Live now. You should hear the MP3 in the right ear and the rep in the left; send them a note and watch it pop up on their call screen.
3. `fly logs -a igani-listen` shows `stream started`, `listener joined/left` and `crm told` lines (never audio). The CRM's audit log has `call.listen.started/stopped` and `call.note.sent`.
